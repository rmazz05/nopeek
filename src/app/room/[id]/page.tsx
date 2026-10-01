import { GameRoom } from "@/components/game-room";
import { notFound } from "next/navigation";
export default async function RoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[a-z0-9]{1,13}$/.test(id)) notFound();
  return <GameRoom id={id} />;
}
