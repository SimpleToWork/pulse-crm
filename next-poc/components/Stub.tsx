export default function Stub({ name }: { name: string }) {
  return (
    <div className="stub">
      <h1>{name}</h1>
      <p>This view hasn’t been migrated yet — it still lives in the current app.<br />Coming in a later phase of the migration.</p>
    </div>
  );
}
