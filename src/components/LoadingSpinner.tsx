export function LoadingSpinner(props: { className?: string }) {
  return (
    <span
      aria-hidden
      className={
        props.className ??
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
      }
    />
  );
}
