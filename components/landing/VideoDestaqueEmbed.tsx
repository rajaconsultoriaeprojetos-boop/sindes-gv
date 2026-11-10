"use client";

import VideoDestaquePreview from "@/components/landing/VideoDestaquePreview";

type Props = {
  url: string;
  titulo?: string;
  data?: string;
  legenda?: string;
  confirmar?: boolean;
};

/** Card de vídeo do dia na landing (preview + link para Instagram; MP4 embutido). */
export default function VideoDestaqueEmbed(props: Props) {
  return <VideoDestaquePreview {...props} />;
}
