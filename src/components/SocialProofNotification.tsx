import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

const notificacoes = [
  { nome: "Mariana", cidade: "Curitiba", acao: "Conheceu o plano Nuvexa Plus", tempo: "há 3 min" },
  { nome: "Lucas", cidade: "São Paulo", acao: "Explorou o Nuvexa Pro", tempo: "há 5 min" },
  { nome: "Amanda", cidade: "Londrina", acao: "Conheceu os recursos da Nuvexa", tempo: "há 8 min" },
  { nome: "Rafael", cidade: "Campinas", acao: "Visualizou o plano Nuvexa Plus", tempo: "há 12 min" },
  { nome: "Camila", cidade: "Florianópolis", acao: "Explorou a Nuvexa IA", tempo: "há 17 min" },
];

const intervalos = [7_000, 11_000, 14_000, 9_000, 18_000];
const tempoVisivel = 5_000;

export function SocialProofNotification() {
  const [indice, setIndice] = useState(0);
  const [visivel, setVisivel] = useState(false);
  const reduzirMovimento = useReducedMotion();
  const notificacao = notificacoes[indice];
  const iniciais = notificacao.nome.slice(0, 1);

  useEffect(() => {
    let temporizadorOcultar: ReturnType<typeof setTimeout> | undefined;
    let temporizadorProxima: ReturnType<typeof setTimeout> | undefined;

    const mostrar = () => {
      setVisivel(true);
      temporizadorOcultar = setTimeout(() => {
        setVisivel(false);
        temporizadorProxima = setTimeout(() => {
          setIndice((indiceAtual) => (indiceAtual + 1) % notificacoes.length);
        }, intervalos[indice]);
      }, tempoVisivel);
    };

    const temporizadorInicial = setTimeout(mostrar, 1_500);

    return () => {
      clearTimeout(temporizadorInicial);
      clearTimeout(temporizadorOcultar);
      clearTimeout(temporizadorProxima);
    };
  }, [indice]);

  const animacaoInicial = reduzirMovimento ? { opacity: 0 } : { opacity: 0, x: -20 };
  const animacaoFinal = reduzirMovimento ? { opacity: 0 } : { opacity: 0, y: 12 };

  return (
    <aside
      aria-label="Exemplo de atividade recente"
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 left-4 z-40 w-[calc(100%-2rem)] max-w-[320px] sm:bottom-6 sm:left-6"
    >
      <AnimatePresence mode="wait">
        {visivel ? (
          <motion.div
            animate={{ opacity: 1, x: 0, y: 0 }}
            className="rounded-xl border border-slate-200 bg-white p-3 shadow-[0_18px_45px_-24px_rgba(15,23,42,0.45)] dark:border-slate-700 dark:bg-slate-900"
            exit={animacaoFinal}
            initial={animacaoInicial}
            key={notificacao.nome}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Demonstração</p>
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 text-sm font-black text-white">
                {iniciais}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-950 dark:text-white">
                  {notificacao.nome} de {notificacao.cidade}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-300">
                  {notificacao.acao} {notificacao.tempo}
                </p>
              </div>
              <CheckCircle2 aria-hidden="true" className="shrink-0 text-emerald-500" size={19} />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </aside>
  );
}
