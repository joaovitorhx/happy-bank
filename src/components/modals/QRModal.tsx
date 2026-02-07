import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BottomSheet } from '@/components/game/BottomSheet';
import { GameButton } from '@/components/game/GameButton';
import { QrCode, Camera, Share2, Clipboard, AlertCircle } from 'lucide-react';
import { buildPayUrl, parsePayUrl } from '@/lib/qrPay';
import type { QrPayPayload } from '@/lib/qrPay';
import type { Room, Player } from '@/types/game';

export interface QRModalScanResult {
  roomCode: string;
  toProfileId: string;
  amount?: number;
  note?: string;
}

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room | null;
  currentPlayer: Player | null;
  /** Chamado quando um QR de pagamento é escaneado/colado e validado. Quem chama deve tentar entrar na sala se necessário e abrir o modal de transferência. */
  onScanSuccess?: (result: QRModalScanResult) => void;
}

export function QRModal({ isOpen, onClose, room, currentPlayer, onScanSuccess }: QRModalProps) {
  const [mode, setMode] = useState<'receive' | 'scan'>('receive');
  const [manualCode, setManualCode] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<InstanceType<typeof import('@zxing/browser').BrowserMultiFormatReader> | null>(null);

  const handleClose = () => {
    setManualCode('');
    setScanError(null);
    onClose();
  };

  // Generate QR for "receive" (pay me)
  useEffect(() => {
    if (!isOpen || mode !== 'receive' || !room || !currentPlayer) {
      setQrDataUrl(null);
      return;
    }
    const { deepLink } = buildPayUrl({
      roomCode: room.code,
      toProfileId: currentPlayer.id,
    });
    import('qrcode').then((QRCode) => {
      QRCode.default.toDataURL(deepLink, { width: 260, margin: 1 }).then(setQrDataUrl);
    }).catch(() => setQrDataUrl(null));
  }, [isOpen, mode, room?.code, currentPlayer?.id]);

  // Camera scanner cleanup on unmount or mode change
  const stopScanner = useCallback(() => {
    if (readerRef.current) {
      try {
        readerRef.current.reset();
      } catch {
        // ignore
      }
      readerRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (!isOpen || mode !== 'scan') {
      stopScanner();
      return;
    }
    return () => stopScanner();
  }, [isOpen, mode, stopScanner]);

  // Câmera + scanner: um único getUserMedia (mobile exige contexto seguro e preferência por um stream)
  useEffect(() => {
    if (!isOpen || mode !== 'scan' || !videoRef.current) return;

    let cancelled = false;
    const video = videoRef.current;
    setScanError(null);

    const startScan = async () => {
      let stream: MediaStream | null = null;
      try {
        // Restrições compatíveis com mobile (iOS Safari, Chrome Android)
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('muted', 'true');
        video.muted = true;
        video.playsInline = true;
        await video.play();
      } catch (err) {
        if (cancelled) return;
        const e = err as Error & { name?: string };
        if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
          setScanError('Acesso à câmera negado. Permita nas configurações do navegador.');
        } else if (e.name === 'NotFoundError') {
          setScanError('Nenhuma câmera encontrada.');
        } else if (e.name === 'NotReadableError') {
          setScanError('Câmera em uso por outro app.');
        } else {
          setScanError('Não foi possível acessar a câmera. Tente novamente.');
        }
        return;
      }

      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        if (cancelled || !stream) return;
        const reader = new BrowserMultiFormatReader();
        readerRef.current = reader;
        reader.decodeFromStream(stream, video, (result, err) => {
          if (err || !result) return;
          try {
            const payload = parseAndValidate(result.getText());
            if (payload) {
              stopScanner();
              onScanSuccess?.({
                roomCode: payload.room,
                toProfileId: payload.to,
                amount: payload.amount,
                note: payload.note,
              });
              handleClose();
            }
          } catch {
            // ignore invalid
          }
        });
      } catch (e) {
        if (!cancelled) setScanError('Leitor de QR não disponível.');
      }
    };

    startScan();
    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [isOpen, mode, onScanSuccess, stopScanner]);

  function parseAndValidate(text: string): QrPayPayload | null {
    return parsePayUrl(text);
  }

  const handleProcessManual = () => {
    const payload = parseAndValidate(manualCode.trim());
    if (!payload) {
      setScanError('Código inválido. Use um QR de pagamento do jogo.');
      return;
    }
    setScanError(null);
    onScanSuccess?.({
      roomCode: payload.room,
      toProfileId: payload.to,
      amount: payload.amount,
      note: payload.note,
    });
    handleClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} title="QR Code">
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode('receive')}
          className={`flex-1 py-3 rounded-xl font-display font-semibold transition-all ${
            mode === 'receive'
              ? 'bg-primary text-primary-foreground shadow-game-sm'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          Receber via QR
        </button>
        <button
          onClick={() => { setMode('scan'); setScanError(null); }}
          className={`flex-1 py-3 rounded-xl font-display font-semibold transition-all ${
            mode === 'scan'
              ? 'bg-primary text-primary-foreground shadow-game-sm'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          Escanear QR
        </button>
      </div>

      <AnimatePresence mode="wait">
        {mode === 'receive' && (
          <motion.div
            key="receive"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            {qrDataUrl ? (
              <div className="flex justify-center">
                <img src={qrDataUrl} alt="QR Pagamento" className="w-64 h-64 rounded-xl bg-white p-2" />
              </div>
            ) : (
              <div className="flex justify-center items-center w-64 h-64 mx-auto rounded-xl bg-muted">
                <QrCode className="w-20 h-20 text-muted-foreground" />
              </div>
            )}
            <p className="text-center text-muted-foreground font-display text-sm">
              Outro jogador escaneia para te pagar
            </p>
            {room && currentPlayer && (
              <GameButton
                variant="primary"
                size="md"
                icon={<Share2 className="w-5 h-5" />}
                className="w-full"
                onClick={() => {
                  const { httpsFallback } = buildPayUrl({
                    roomCode: room.code,
                    toProfileId: currentPlayer.id,
                  });
                  if (navigator.share) {
                    navigator.share({
                      title: 'Pagamento via QR',
                      text: `Me pague na sala ${room.code}. Link: ${httpsFallback}`,
                      url: httpsFallback,
                    });
                  } else {
                    navigator.clipboard.writeText(httpsFallback);
                  }
                }}
              >
                Compartilhar link
              </GameButton>
            )}
          </motion.div>
        )}

        {mode === 'scan' && (
          <motion.div
            key="scan"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="relative rounded-xl overflow-hidden bg-black max-w-[280px] mx-auto aspect-square">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                muted
                playsInline
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="border-2 border-white/50 rounded-xl w-56 h-56" />
              </div>
            </div>

            {scanError && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{scanError}</span>
              </div>
            )}

            <div>
              <label className="block font-display font-semibold mb-2">
                Ou cole o link manualmente
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => { setManualCode(e.target.value); setScanError(null); }}
                  placeholder="bankgame://pay?... ou https://..."
                  className="flex-1 p-3 rounded-xl bg-muted border-2 border-border focus:border-primary outline-none font-display text-sm"
                />
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      setManualCode(text);
                      setScanError(null);
                    } catch {
                      setScanError('Não foi possível colar');
                    }
                  }}
                  className="p-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
                >
                  <Clipboard className="w-5 h-5" />
                </button>
              </div>
            </div>

            <GameButton
              variant="primary"
              size="md"
              disabled={!manualCode.trim()}
              className="w-full"
              onClick={handleProcessManual}
            >
              Processar pagamento
            </GameButton>
          </motion.div>
        )}
      </AnimatePresence>
    </BottomSheet>
  );
}
