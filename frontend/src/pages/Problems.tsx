const PROBLEMS = [
  { id: 1, title: 'Two Sum', difficulty: 'Easy' },
  { id: 2, title: 'Add Two Numbers', difficulty: 'Medium' },
  { id: 3, title: 'Median of Two Sorted Arrays', difficulty: 'Hard' },
];

export function Problems() {
  return (
    <section>
      <h1>Problemas</h1>
      <ul>
        {PROBLEMS.map((p) => (
          <li key={p.id}>
            #{p.id} {p.title} <em>({p.difficulty})</em>
          </li>
        ))}
      </ul>
    </section>
  );
}
