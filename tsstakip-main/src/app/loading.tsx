export default function RootLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-accent">
      <div className="flex flex-col items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="TSS Takip" className="size-16 rounded-2xl animate-pulse" src="/icon.svg" />
        <div className="flex gap-1">
          <span className="size-2 animate-bounce rounded-full bg-white" style={{ animationDelay: "0ms" }} />
          <span className="size-2 animate-bounce rounded-full bg-white" style={{ animationDelay: "150ms" }} />
          <span className="size-2 animate-bounce rounded-full bg-white" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}
