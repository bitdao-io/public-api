import Link from "next/link";

export default function Home() {
  return (
    <>
      <h1 className="text-lg">Bitdao Public API</h1>
      <div className="flex flex-col">
        <Link href="playground">Playground</Link>
        <Link href="api-doc">Swagger</Link>
      </div>
    </>
  );
}
