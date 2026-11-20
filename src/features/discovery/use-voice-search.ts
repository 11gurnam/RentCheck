"use client";
import { useEffect, useRef, useState } from "react";

type SpeechResult = { isFinal: boolean; 0?: { transcript: string } };
type Recognition = {
  lang: string;
  continuous: boolean;
  onstart: (() => void) | null;
  onaudioend: (() => void) | null;
  onresult: ((event: { results: ArrayLike<SpeechResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type BrowserSpeech = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};
type Session = { recognition: Recognition; timeout?: number };
type Phase = "idle" | "requesting" | "listening" | "processing" | "completed" | "error";

const noSpeech = "We didn’t hear any words. Try voice search again or type your search.";
const failed = "Voice search was interrupted. Try again or type your search.";

function dispose(session: Session) {
  const { recognition, timeout } = session;
  window.clearTimeout(timeout);
  recognition.onstart = recognition.onaudioend = recognition.onend = null;
  recognition.onresult = recognition.onerror = null;
}

export function useVoiceSearch(applyTranscript: (transcript: string) => string) {
  const [status, setStatus] = useState<{ phase: Phase; message: string }>({ phase: "idle", message: "" });
  const active = useRef<Session | null>(null);
  const language = useRef("en-IN");
  const apply = useRef(applyTranscript);

  useEffect(() => { apply.current = applyTranscript; }, [applyTranscript]);

  useEffect(() => () => {
    const session = active.current;
    active.current = null;
    if (session) {
      dispose(session);
      session.recognition.abort();
    }
  }, []);

  function start() {
    if (active.current) return;
    const browser = window as BrowserSpeech;
    const SpeechRecognition = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    if (!browser.isSecureContext || !SpeechRecognition) {
      setStatus({ phase: "error", message: "Voice search isn’t available here. Use a supported browser on a secure connection, or type your search." });
      return;
    }

    let recognition: Recognition;
    try {
      recognition = new SpeechRecognition();
    } catch {
      setStatus({ phase: "error", message: failed });
      return;
    }
    recognition.lang = language.current;
    recognition.continuous = false;
    const session: Session = { recognition };
    active.current = session;
    let transcript = "";
    setStatus({ phase: "requesting", message: "Starting voice search. Allow microphone access if prompted." });

    function finish() {
      if (active.current !== session) return false;
      active.current = null;
      dispose(session);
      return true;
    }

    recognition.onstart = () => {
      if (active.current !== session) return;
      setStatus({ phase: "listening", message: "Listening… Speak your search in English." });
    };
    recognition.onaudioend = () => {
      if (active.current === session) setStatus({ phase: "processing", message: "Processing your search…" });
    };
    recognition.onresult = ({ results }) => {
      if (active.current !== session) return;
      transcript = Array.from(results).filter(result => result.isFinal)
        .map(result => result[0]?.transcript.trim()).filter(Boolean).join(" ");
      if (transcript) setStatus({ phase: "processing", message: "Processing your search…" });
    };
    recognition.onend = () => {
      if (!finish()) return;
      if (transcript) setStatus({ phase: "completed", message: apply.current(transcript) });
      else setStatus({ phase: "error", message: noSpeech });
    };
    recognition.onerror = ({ error }) => {
      if (!finish()) return;
      let message = failed;
      if (error === "not-allowed") message = "Microphone access is required. Allow it for this site in your browser settings, then try again.";
      if (error === "audio-capture") message = "No microphone is available. Connect one or type your search.";
      if (error === "no-speech") message = noSpeech;
      if (error === "service-not-allowed") message = "Your browser’s speech recognition is unavailable. Check its settings or type your search.";
      if (error === "language-not-supported" && language.current === "en-IN") {
        language.current = "en-US";
        message = "Indian English isn’t available in this browser. Try again to use another English recognition setting.";
      }
      setStatus({ phase: "error", message });
    };
    session.timeout = window.setTimeout(() => {
      if (!finish()) return;
      recognition.abort();
      setStatus({ phase: "error", message: "Voice search timed out. Try again or type your search." });
    }, 60000);
    try {
      recognition.start();
    } catch {
      if (finish()) setStatus({ phase: "error", message: failed });
    }
  }

  function stop() {
    const session = active.current;
    if (!session) return;
    if (status.phase === "requesting") {
      active.current = null;
      dispose(session);
      session.recognition.abort();
      setStatus({ phase: "idle", message: "Voice search cancelled." });
      return;
    }
    setStatus({ phase: "processing", message: "Processing your search…" });
    session.recognition.stop();
  }

  return { ...status, start, stop };
}
