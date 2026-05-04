interface Props {
  questions: string[];
  title: string;
}

export function CallQueueQuestions({ questions, title }: Props): JSX.Element {
  return (
    <div className="w-full bg-dfxGray-100 rounded-lg shadow-sm p-4">
      <h3 className="text-base font-semibold text-dfxBlue-800 mb-3">{title}</h3>
      <ol className="list-decimal list-inside flex flex-col gap-2 text-sm text-dfxBlue-800 text-left">
        {questions.map((q, i) => (
          <li key={i} className="leading-snug whitespace-pre-wrap">
            {q}
          </li>
        ))}
      </ol>
    </div>
  );
}
