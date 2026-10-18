import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Volume2,
  Play,
  Pause,
  RotateCcw,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { fetchReportAudio } from '../services/api';

export interface AudioBriefingPlayerProps {
  reportId: string;
  viewToken?: string | null;
  className?: string;
}

export const AudioBriefingPlayer: React.FC<AudioBriefingPlayerProps> = ({
  reportId,
  viewToken,
  className = '',
}) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'disabled' | 'error'>('idle');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [showSummaryText, setShowSummaryText] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentBlobUrlRef = useRef<string | null>(null);

  // Clean up Object URL on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (currentBlobUrlRef.current) {
        URL.revokeObjectURL(currentBlobUrlRef.current);
        currentBlobUrlRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  const handleGenerateAndPlay = useCallback(async () => {
    // If audio element is already ready, just toggle playback
    if (status === 'ready' && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (playErr) {
          console.error('[AudioPlayer] Playback failed:', playErr);
        }
      }
      return;
    }

    setStatus('loading');
    setStatusMessage(null);

    try {
      const result = await fetchReportAudio(reportId, viewToken);

      if (result.summaryText) {
        setSummaryText(result.summaryText);
      }

      if (result.status === 'disabled') {
        setStatus('disabled');
        setStatusMessage(result.message || 'ElevenLabs voice narration is unconfigured on this server.');
        return;
      }

      if (result.status === 'error' || !result.audioBase64) {
        setStatus('error');
        setStatusMessage(result.message || 'Unable to generate audio narration.');
        return;
      }

      // Convert Base64 to Blob
      const binaryString = window.atob(result.audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: result.mimeType || 'audio/mpeg' });

      // Revoke old URL if existing
      if (currentBlobUrlRef.current) {
        URL.revokeObjectURL(currentBlobUrlRef.current);
      }

      const blobUrl = URL.createObjectURL(blob);
      currentBlobUrlRef.current = blobUrl;

      const audio = new Audio(blobUrl);
      audioRef.current = audio;

      audio.onloadedmetadata = () => {
        setDuration(audio.duration || result.durationEstimateSeconds || 0);
      };

      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
      };

      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      audio.onerror = () => {
        setStatus('error');
        setStatusMessage('Audio playback encountered an error.');
        setIsPlaying(false);
      };

      setStatus('ready');
      await audio.play();
      setIsPlaying(true);
    } catch (err: any) {
      setStatus('error');
      setStatusMessage(err.message || 'Failed to request audio summary.');
    }
  }, [reportId, viewToken, status, isPlaying]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleRestart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      if (!isPlaying) {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      className={`bg-white border border-[#E2E5DE] rounded-2xl p-4 sm:p-5 transition-all shadow-xs ${className}`}
      aria-label="Executive Audio Briefing"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Title and metadata */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#163300]/5 flex items-center justify-center text-[#163300] shrink-0">
            <Volume2 className="w-5 h-5 text-[#163300]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-semibold text-sm sm:text-base text-[#111111] uppercase tracking-tight">
                Executive Audio Briefing
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#9FE870]/40 text-[#163300]">
                <Sparkles className="w-2.5 h-2.5" />
                ElevenLabs Voice
              </span>
            </div>
            <p className="text-xs text-[#5F625E] font-sans">
              Grounded 60-second synthesized briefing of verified evidence and candidate coverage.
            </p>
          </div>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-2 shrink-0">
          {status === 'ready' && (
            <button
              onClick={handleRestart}
              aria-label="Restart audio playback"
              className="p-2 rounded-xl text-[#5F625E] hover:text-[#111111] hover:bg-[#F2F4F0] transition-colors"
              title="Restart"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleGenerateAndPlay}
            disabled={status === 'loading'}
            aria-label={
              status === 'loading'
                ? 'Generating audio briefing...'
                : isPlaying
                ? 'Pause audio briefing'
                : 'Listen to Executive Summary'
            }
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-xs ${
              isPlaying
                ? 'bg-[#163300] text-white hover:bg-[#163300]/90'
                : 'bg-[#9FE870] text-[#163300] hover:bg-[#8CD85E] active:scale-95'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {status === 'loading' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Synthesizing...</span>
              </>
            ) : isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{status === 'ready' ? 'Resume' : 'Listen to Briefing'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Playback Progress Scrubber (when ready) */}
      {status === 'ready' && (
        <div className="mt-4 pt-3 border-t border-[#E2E5DE] space-y-1.5">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-[#5F625E] w-8">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 60}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              aria-label="Audio scrubber"
              className="flex-1 accent-[#163300] h-1.5 bg-[#E2E5DE] rounded-lg cursor-pointer"
            />
            <span className="text-[11px] font-mono text-[#5F625E] w-8 text-right">
              {formatTime(duration)}
            </span>
          </div>
        </div>
      )}

      {/* Unconfigured / Disabled State */}
      {status === 'disabled' && (
        <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200/60 flex items-start justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Voice Unconfigured:</strong> {statusMessage || 'Configure ELEVENLABS_API_KEY in server environment to enable audio synthesis.'}
            </span>
          </div>
          {summaryText && (
            <button
              onClick={() => setShowSummaryText(!showSummaryText)}
              className="text-amber-900 underline font-semibold shrink-0 hover:text-amber-950 flex items-center gap-1"
            >
              <FileText className="w-3 h-3" />
              {showSummaryText ? 'Hide Text' : 'View Text'}
            </button>
          )}
        </div>
      )}

      {/* Error State */}
      {status === 'error' && (
        <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200/60 flex items-center justify-between gap-3 text-xs text-rose-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              <strong>Audio Error:</strong> {statusMessage}
            </span>
          </div>
          {summaryText && (
            <button
              onClick={() => setShowSummaryText(!showSummaryText)}
              className="text-rose-900 underline font-semibold shrink-0 hover:text-rose-950 flex items-center gap-1"
            >
              <FileText className="w-3 h-3" />
              {showSummaryText ? 'Hide Text' : 'View Text'}
            </button>
          )}
        </div>
      )}

      {/* Grounded Text Transcript Accordion (Optional disclosure) */}
      {(summaryText || status === 'ready') && (
        <div className="mt-3 pt-2">
          <button
            onClick={() => setShowSummaryText(!showSummaryText)}
            className="flex items-center gap-1 text-[11px] font-mono font-medium text-[#5F625E] hover:text-[#111111] transition-colors"
          >
            <FileText className="w-3 h-3" />
            <span>{showSummaryText ? 'Hide Written Briefing Transcript' : 'Read Written Briefing Transcript'}</span>
            {showSummaryText ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {showSummaryText && summaryText && (
            <div className="mt-2 p-3 bg-[#F2F4F0] rounded-xl text-xs text-[#111111] leading-relaxed font-sans border border-[#E2E5DE]">
              <p>{summaryText}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AudioBriefingPlayer;
