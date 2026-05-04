import { useState, useRef, useEffect } from "react";
import { Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * VoiceDictation — drop-in voice input button.
 * Props:
 *   onTranscript(text) — called with the new transcript chunk to append
 *   className — optional extra classes on the button
 *   label — button label when idle (default: "Dictate")
 */
export default function VoiceDictation({ onTranscript, className = "", label = "Dictate" }) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript + ' ';
        }
      }
      if (transcript.trim() && onTranscript) {
        onTranscript(transcript.trim());
      }
    };

    recognition.onerror = (event) => {
      if (event.error !== 'aborted') {
        console.error('Speech recognition error:', event.error);
      }
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [onTranscript]);

  const toggle = () => {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      recognitionRef.current.start();
      setListening(true);
    }
  };

  if (!supported) return null;

  return (
    <Button
      type="button"
      variant={listening ? "destructive" : "outline"}
      size="sm"
      onClick={toggle}
      className={`gap-1.5 ${className}`}
      title={listening ? "Stop dictating" : "Start voice dictation"}
    >
      {listening ? (
        <>
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
          </span>
          <Square className="w-3.5 h-3.5" /> Stop
        </>
      ) : (
        <>
          <Mic className="w-3.5 h-3.5" />
          {label}
        </>
      )}
    </Button>
  );
}