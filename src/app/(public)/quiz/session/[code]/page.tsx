"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2, LogOut, Shield } from "lucide-react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import {
  getQuizSessionStateAction,
  startQuizSessionAction,
  submitAnswerAction,
  nextQuestionAction,
  getLeaderboardAction,
  joinQuizSessionAction,
  ParticipantScore,
} from "@/app/actions/quiz-session-actions";
import { EcgLine } from "../../components/EcgLine";
import { MultiplayerLobby } from "../components/MultiplayerLobby";
import { MultiplayerGame } from "../components/MultiplayerGame";
import { MultiplayerLeaderboard } from "../components/MultiplayerLeaderboard";

// Presence Payload Type
interface ParticipantPresence {
  presence_ref: string;
  nickname: string;
  id: string;
}

// Session state interface
interface QuizSessionState {
  id: string;
  code: string;
  status: "LOBBY" | "IN_PROGRESS" | "FINISHED";
  currentQuestionId: number | null;
  currentQuestionStartedAt: Date | null;
  timePerQuestion: number;
  quizTitle: string;
  questions: Array<{
    id: number;
    text: string;
    correctAnswer?: string;
    explanation?: string | null;
    options: Array<{ id: number; text: string }>;
  }>;
}

// Realtime Broadcast payload structure
interface BroadcastPayload {
  type: string;
  currentQuestionId?: number;
  status?: "LOBBY" | "IN_PROGRESS" | "FINISHED";
  answersCount?: number;
}

export default function QuizSessionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = (params?.code as string)?.toUpperCase();
  const hostToken = searchParams?.get("hostToken") || undefined;

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Session state from DB
  const [session, setSession] = useState<QuizSessionState | null>(null);

  // Client user state
  const [isHost, setIsHost] = useState(false);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string>("");
  const [hostNicknameInput, setHostNicknameInput] = useState("");

  // Realtime lists & states
  const [participants, setParticipants] = useState<
    { id: string; nickname: string }[]
  >([]);
  const [leaderboard, setLeaderboard] = useState<ParticipantScore[]>([]);

  const currentQuestion = session?.questions?.find(
    (q) => q.id === session.currentQuestionId
  );
  const [copied, setCopied] = useState(false);

  // Game/Question states
  const [timeRemaining, setTimeRemaining] = useState<number>(30);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [answerFeedback, setAnswerFeedback] = useState<{
    isCorrect: boolean;
    points: number;
  } | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);

  // Refs for tracking presence & channel
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Initial State Load
  useEffect(() => {
    if (!mounted || !code) return;

    const init = async () => {
      try {
        const isUserHost = !!hostToken;
        setIsHost(isUserHost);

        const res = await getQuizSessionStateAction(code, hostToken);
        if (res.success && res.data) {
          const sessionData: QuizSessionState = {
            id: res.data.id,
            code: res.data.code,
            status: res.data.status as "LOBBY" | "IN_PROGRESS" | "FINISHED",
            currentQuestionId: res.data.currentQuestionId,
            currentQuestionStartedAt: res.data.currentQuestionStartedAt
              ? new Date(res.data.currentQuestionStartedAt)
              : null,
            timePerQuestion: res.data.timePerQuestion,
            quizTitle: res.data.quizTitle,
            questions: res.data.questions.map((q) => ({
              id: q.id,
              text: q.text,
              correctAnswer: q.correctAnswer || undefined,
              explanation: q.explanation || undefined,
              options: q.options.map((opt) => ({
                id: opt.id,
                text: opt.text,
              })),
            })),
          };

          setSession(sessionData);
          setTimeRemaining(sessionData.timePerQuestion);

          const storedId = sessionStorage.getItem(
            `quiz_participant_${sessionData.id}`
          );
          const storedNick = sessionStorage.getItem(
            `quiz_nickname_${sessionData.id}`
          );

          if (isUserHost) {
            if (storedId && storedNick) {
              setParticipantId(storedId);
              setNickname(storedNick);
            }
          } else {
            if (!storedId || !storedNick) {
              router.push("/quiz?error=session_join_required");
              return;
            }
            setParticipantId(storedId);
            setNickname(storedNick);
          }
          setError(null);
        } else {
          setError(res.error || "Session de quiz introuvable");
        }
      } catch (err) {
        setError("Impossible de charger la session");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [mounted, code, hostToken, router]);

  const handleHostRegisterToPlay = async () => {
    if (!hostNicknameInput.trim() || !session) return;
    try {
      const res = await joinQuizSessionAction(session.code, hostNicknameInput);
      if (res.success && res.participantId) {
        sessionStorage.setItem(
          `quiz_participant_${session.id}`,
          res.participantId
        );
        sessionStorage.setItem(
          `quiz_nickname_${session.id}`,
          res.nickname || hostNicknameInput
        );
        setParticipantId(res.participantId);
        setNickname(res.nickname || hostNicknameInput);

        if (channelRef.current) {
          await channelRef.current.track({
            nickname: res.nickname || hostNicknameInput,
            id: res.participantId,
          });
        }
      } else {
        alert(res.error || "Impossible de rejoindre le jeu");
      }
    } catch (err) {
      alert("Une erreur inattendue est survenue");
    }
  };

  // 2. Realtime Synchronization (Presence & Broadcast)
  useEffect(() => {
    if (!supabase || !session) return;

    const channelName = `quiz-room-${session.id}`;
    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const usersList: { id: string; nickname: string }[] = [];

        Object.values(state).forEach((presences) => {
          (presences as unknown as ParticipantPresence[]).forEach(
            (presence) => {
              if (presence.nickname && presence.id) {
                usersList.push({
                  id: presence.id,
                  nickname: presence.nickname,
                });
              }
            }
          );
        });

        const uniqueUsers = usersList.filter(
          (value, index, self) =>
            self.findIndex((u) => u.id === value.id) === index
        );
        setParticipants(uniqueUsers);
      })
      .on(
        "broadcast",
        { event: "quiz-control" },
        (payload: { payload: BroadcastPayload }) => {
          const { type, currentQuestionId, status, answersCount } =
            payload.payload;

          if (type === "start" || type === "next-question") {
            setSession((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                status: "IN_PROGRESS",
                currentQuestionId: currentQuestionId || null,
                currentQuestionStartedAt: new Date(),
              };
            });
            setHasAnswered(false);
            setSelectedOptionId(null);
            setAnswerFeedback(null);
            setAnsweredCount(0);
          } else if (type === "status-change") {
            setSession((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                status:
                  (status as "LOBBY" | "IN_PROGRESS" | "FINISHED") ||
                  prev.status,
              };
            });
          } else if (type === "answer-submitted") {
            setAnsweredCount(answersCount || 0);
          }
        }
      )
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && nickname && participantId) {
          await channel.track({
            nickname,
            id: participantId,
          });
        }
      });

    if (session.status === "FINISHED") {
      getLeaderboardAction(session.id).then((res) => {
        if (res.success && res.data) setLeaderboard(res.data);
      });
    }

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [session, isHost, nickname, participantId]);

  // 3. Question Timer countdown
  useEffect(() => {
    if (
      !session ||
      session.status !== "IN_PROGRESS" ||
      !session.currentQuestionId
    )
      return;

    setTimeRemaining(session.timePerQuestion);

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  // Keyboard Shortcuts for options selection
  useEffect(() => {
    if (
      session?.status !== "IN_PROGRESS" ||
      !currentQuestion ||
      isHost ||
      hasAnswered ||
      timeRemaining === 0
    )
      return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      const optionIndex = ["A", "B", "C", "D"].indexOf(key);
      if (optionIndex !== -1 && currentQuestion.options[optionIndex]) {
        handleSubmitAnswer(currentQuestion.options[optionIndex].id);
      }

      const numIndex = ["1", "2", "3", "4"].indexOf(e.key);
      if (numIndex !== -1 && currentQuestion.options[numIndex]) {
        handleSubmitAnswer(currentQuestion.options[numIndex].id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [session, currentQuestion, isHost, hasAnswered, timeRemaining]);

  // 4. Actions
  const handleStartQuiz = async () => {
    if (!session || !isHost) return;
    try {
      const res = await startQuizSessionAction(session.id);
      if (res.success && res.currentQuestionId) {
        setSession((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            status: "IN_PROGRESS",
            currentQuestionId: res.currentQuestionId || null,
            currentQuestionStartedAt: new Date(),
          };
        });
        channelRef.current?.send({
          type: "broadcast",
          event: "quiz-control",
          payload: {
            type: "start",
            currentQuestionId: res.currentQuestionId,
          },
        });
      }
    } catch (err) {
      alert("Erreur lors du démarrage du quiz");
    }
  };

  const handleNextQuestion = async () => {
    if (!session || !isHost) return;
    try {
      const res = await nextQuestionAction(session.id);
      if (res.success) {
        if (res.finished) {
          setSession((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              status: "FINISHED",
              currentQuestionId: null,
            };
          });
          const lbRes = await getLeaderboardAction(session.id);
          if (lbRes.success && lbRes.data) {
            setLeaderboard(lbRes.data);
          }
          channelRef.current?.send({
            type: "broadcast",
            event: "quiz-control",
            payload: {
              type: "status-change",
              status: "FINISHED",
            },
          });
        } else {
          setSession((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              currentQuestionId: res.currentQuestionId || null,
              currentQuestionStartedAt: new Date(),
            };
          });
          setAnsweredCount(0);
          channelRef.current?.send({
            type: "broadcast",
            event: "quiz-control",
            payload: {
              type: "next-question",
              currentQuestionId: res.currentQuestionId,
            },
          });
        }
      }
    } catch (err) {
      alert("Erreur lors du passage à la question suivante");
    }
  };

  const handleSubmitAnswer = async (optionId: number) => {
    if (
      !session ||
      !participantId ||
      hasAnswered ||
      isHost ||
      !session.currentQuestionId
    )
      return;

    setSelectedOptionId(optionId);
    setHasAnswered(true);

    try {
      const res = await submitAnswerAction(
        session.id,
        participantId,
        session.currentQuestionId,
        optionId
      );
      if (
        res.success &&
        res.points !== undefined &&
        res.isCorrect !== undefined
      ) {
        setAnswerFeedback({
          isCorrect: res.isCorrect,
          points: res.points,
        });

        const newCount = answeredCount + 1;
        setAnsweredCount(newCount);
        channelRef.current?.send({
          type: "broadcast",
          event: "quiz-control",
          payload: {
            type: "answer-submitted",
            answersCount: newCount,
          },
        });
      } else {
        alert(res.error || "Erreur lors de l'enregistrement de la réponse");
      }
    } catch (err) {
      alert("Erreur de communication avec le serveur");
    }
  };

  const copyLink = () => {
    if (!session) return;
    navigator.clipboard.writeText(session.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 5. Render States
  if (!mounted) return null;

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
        <p className="mt-4 font-medium text-gray-600">
          Chargement de la session...
        </p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <div className="max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-md">
          <p className="mb-4 text-xl font-bold text-red-600">Oups !</p>
          <p className="mb-6 text-gray-600">
            {error || "Impossible de charger la session."}
          </p>
          <button
            onClick={() => router.push("/quiz")}
            className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Retour au catalogue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <EcgLine />

      <div className="relative z-10 mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex flex-col border-b border-gray-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-800">
              {isHost && <Shield className="h-5 w-5 text-purple-600" />}
              {session.quizTitle}
            </h1>
            <p className="text-sm text-gray-600">
              Session Multijoueurs :{" "}
              <span className="font-bold text-purple-600">{session.code}</span>
            </p>
          </div>
          <button
            onClick={() => router.push("/quiz")}
            className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 sm:mt-0"
          >
            <LogOut className="h-4 w-4" /> Quitter
          </button>
        </div>

        {/* LOBBY STATE */}
        {session.status === "LOBBY" && (
          <MultiplayerLobby
            session={session}
            isHost={isHost}
            participantId={participantId}
            nickname={nickname}
            participants={participants}
            copied={copied}
            hostNicknameInput={hostNicknameInput}
            setHostNicknameInput={setHostNicknameInput}
            handleHostRegisterToPlay={handleHostRegisterToPlay}
            handleStartQuiz={handleStartQuiz}
            copyLink={copyLink}
          />
        )}

        {/* IN_PROGRESS GAME STATE */}
        {session.status === "IN_PROGRESS" && currentQuestion && (
          <MultiplayerGame
            session={session}
            currentQuestion={currentQuestion}
            isHost={isHost}
            participantId={participantId}
            timeRemaining={timeRemaining}
            answeredCount={answeredCount}
            hasAnswered={hasAnswered}
            selectedOptionId={selectedOptionId}
            answerFeedback={answerFeedback}
            handleSubmitAnswer={handleSubmitAnswer}
            handleNextQuestion={handleNextQuestion}
          />
        )}

        {/* FINISHED RESULTS / LEADERBOARD STATE */}
        {session.status === "FINISHED" && (
          <MultiplayerLeaderboard
            leaderboard={leaderboard}
            onBack={() => router.push("/quiz")}
          />
        )}
      </div>
    </div>
  );
}
