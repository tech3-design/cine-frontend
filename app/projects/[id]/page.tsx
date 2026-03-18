"use client";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function OldProjectPage() {
  const params = useParams();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/dashboard/${params.id}`);
  }, [params.id, router]);
  return null;
}
