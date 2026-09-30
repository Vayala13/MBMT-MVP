import { useLogCall, type CallPreset } from "@/components/LogCallDialog";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import type { Case } from "@shared/types";
import { FlaskConical, Phone, PhoneIncoming, PhoneOff } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "sonner";
import { Link } from "wouter";

/**
 * PRACTICE ONLY. No phone is connected: this simulates what a real phone
 * integration (parked for v2) would feel like, using demo cases.
 * Numbers use the 555-01XX range reserved for fiction.
 */

type Scenario = {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  transcript: (staff: string, caller: string) => string;
};

const SCENARIOS: Scenario[] = [
  {
    summary:
      "Client asked what to expect at mediation and whether they must attend in person.",
    keyPoints: [
      "Client is nervous about mediation and wants to know how long it lasts",
      "Asked whether attending by video is allowed",
      "Prefers email for scheduling details",
    ],
    actionItems: [
      "Email client the mediation checklist",
      "Ask the mediator whether remote attendance is allowed",
    ],
    transcript: (s, c) =>
      `${s}: MBMT, this is ${s}.\n${c}: Hi, I have a question about the mediation next month.\n${s}: Of course. What would you like to know?\n${c}: How long does it usually take, and do I have to be there in person?\n${s}: It often runs most of the day. I'll check with the mediator about attending by video and email you a checklist.\n${c}: Email works best for me. Thank you.`,
  },
  {
    summary: "Client has new medical bills and wants to know how to send them.",
    keyPoints: [
      "Client received three new bills from a physical therapy clinic",
      "Client does not have a scanner at home",
    ],
    actionItems: [
      "Send client instructions for uploading photos of the bills",
      "Update the damages list when the bills arrive",
    ],
    transcript: (s, c) =>
      `${s}: MBMT, this is ${s}.\n${c}: Hi, I got some more bills in the mail from physical therapy.\n${s}: Thank you for letting us know. How many are there?\n${c}: Three. I don't have a scanner though.\n${s}: Photos from your phone are fine. I'll send you instructions for uploading them.\n${c}: Perfect, thanks.`,
  },
  {
    summary: "Client gave their available dates for a deposition.",
    keyPoints: [
      "Client is available the second and third week of next month",
      "Mornings work better than afternoons",
    ],
    actionItems: [
      "Send the client's available dates to opposing counsel",
      "Schedule a deposition prep session with the attorney",
    ],
    transcript: (s, c) =>
      `${s}: MBMT, this is ${s}.\n${c}: Hi, you asked me for dates for my deposition.\n${s}: Yes, thank you for calling back. What works for you?\n${c}: The second and third week of next month, mornings if possible.\n${s}: Great. I'll send those to the other side and set up a prep session with the attorney.\n${c}: Sounds good.`,
  },
];

type Ringing = {
  kase: Case;
  number: string;
  scenario: Scenario;
  answeredAt: number | null;
};

type IncomingApi = { simulateIncomingCall: () => void };
const IncomingContext = createContext<IncomingApi | null>(null);

export function useIncomingCall(): IncomingApi {
  const ctx = useContext(IncomingContext);
  if (!ctx)
    throw new Error(
      "useIncomingCall must be used inside <IncomingCallProvider>"
    );
  return ctx;
}

const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const fakeNumber = () =>
  `(555) 555-01${String(Math.floor(Math.random() * 100)).padStart(2, "0")}`;
const clock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export function IncomingCallProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useSession();
  const { openLogCall } = useLogCall();
  const [call, setCall] = useState<Ringing | null>(null);
  const [now, setNow] = useState(Date.now());

  const simulateIncomingCall = useCallback(async () => {
    const cases = await api<Case[]>("/cases?status=active");
    if (!cases.length) return;
    setCall({
      kase: pick(cases),
      number: fakeNumber(),
      scenario: pick(SCENARIOS),
      answeredAt: null,
    });
  }, []);

  // Tick the on-call timer.
  useEffect(() => {
    if (!call?.answeredAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [call?.answeredAt]);

  const caller = call ? `${call.kase.clientName} (client)` : "";
  const staffFirst = user?.name.split(" ")[0] ?? "Staff";

  const presetFor = (c: Ringing, answered: boolean): CallPreset =>
    answered
      ? {
          caseId: c.kase.id,
          direction: "in",
          withWhom: caller,
          summary: c.scenario.summary,
          keyPoints: c.scenario.keyPoints,
          actionItems: c.scenario.actionItems,
          transcript: c.scenario.transcript(
            staffFirst,
            c.kase.clientName.split(" ")[0]
          ),
          practice: true,
        }
      : {
          caseId: c.kase.id,
          direction: "in",
          withWhom: caller,
          summary: `Missed call from ${c.number}. Call back.`,
        };

  const answer = () => call && setCall({ ...call, answeredAt: Date.now() });
  const endCall = () => {
    if (!call) return;
    openLogCall(presetFor(call, true));
    setCall(null);
  };
  const decline = () => {
    if (!call) return;
    const missed = presetFor(call, false);
    toast("Call declined", {
      description: `${caller} · ${call.number}`,
      action: { label: "Log it", onClick: () => openLogCall(missed) },
    });
    setCall(null);
  };

  return (
    <IncomingContext.Provider value={{ simulateIncomingCall }}>
      {children}
      {call && (
        <div
          role="alertdialog"
          aria-labelledby="incoming-name"
          aria-describedby="incoming-detail"
          className="fixed top-5 right-5 z-[60] w-[23rem] bg-navy text-plaster p-5 border border-plaster/15 animate-fade-in-up"
        >
          <div className="flex items-center justify-between text-[0.65rem] tracking-[0.22em] uppercase text-sandstone-light">
            <span className="flex items-center gap-2">
              <PhoneIncoming
                className="size-3.5"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              {call.answeredAt
                ? `On call · ${clock(now - call.answeredAt)}`
                : "Incoming call"}
            </span>
            <span className="flex items-center gap-1.5 text-gold">
              <FlaskConical
                className="size-3"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              Practice
            </span>
          </div>
          <div id="incoming-name" className="display text-3xl mt-3">
            {call.kase.clientName}
          </div>
          <div
            id="incoming-detail"
            className="text-sm text-sandstone-light mt-1"
          >
            {call.number} · Client
          </div>
          <div className="text-sm mt-3 border-t border-plaster/15 pt-3">
            <span className="text-sandstone-light">Matches </span>
            <Link
              href={`/cases/${call.kase.id}`}
              className="link-quiet text-plaster"
            >
              {call.kase.caption}
            </Link>
          </div>

          <div className="flex gap-2 mt-5">
            {call.answeredAt ? (
              <button
                type="button"
                onClick={endCall}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-roof border border-roof px-4 py-3 text-[0.7rem] tracking-[0.2em] uppercase hover:bg-plaster hover:text-roof transition-colors duration-300"
              >
                <PhoneOff
                  className="size-3.5"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                End call &amp; log it
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={answer}
                  autoFocus
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-[#2f6e6b] border border-[#2f6e6b] px-4 py-3 text-[0.7rem] tracking-[0.2em] uppercase hover:bg-plaster hover:text-navy transition-colors duration-300"
                >
                  <Phone
                    className="size-3.5"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  Answer
                </button>
                <button
                  type="button"
                  onClick={decline}
                  className="flex-1 inline-flex items-center justify-center gap-2 border border-plaster/30 px-4 py-3 text-[0.7rem] tracking-[0.2em] uppercase hover:border-plaster transition-colors duration-300"
                >
                  <PhoneOff
                    className="size-3.5"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  Decline
                </button>
              </>
            )}
          </div>
          <p className="text-[0.7rem] text-sandstone-light mt-3">
            Simulated. No phone is connected in the prototype.
          </p>
        </div>
      )}
    </IncomingContext.Provider>
  );
}
