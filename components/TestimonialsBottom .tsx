"use client";
import React, { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/pagination";
import { Pagination } from "swiper/modules";
import Image from "next/image";
import dynamic from "next/dynamic";

const ProvenExpertScript = dynamic(() => import("@/components/ProvenExpertScript"), {
  ssr: false,
  loading: () => <div style={{ minHeight: "300px", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading reviews...</div>
});

const API_URL =
  `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/pages/68c10a17cb79fffc27944876?depth=2&draft=false&locale=undefined&trash=false`;

const absUrl = (u?: string) =>
  u?.startsWith("http") ? u : u ? `${process.env.NEXT_PUBLIC_API_BASE_URL}${u}` : "";

const toMediaUrl = (m: any) =>
  absUrl(m?.sizes?.og?.url || m?.sizes?.large?.url || m?.url || m?.sizes?.thumbnail?.url || "");

const descriptionToHtml = (input: any): string => {
  if (!input) return "";
  const root = typeof input === "string" ? { children: [{ children: [{ text: input }]}]} : input?.root || input;
  return (root.children || [])
    .map((p: any) =>
      (p.children || [])
        .map((c: any) => (c?.type === "linebreak" ? "<br/>" : c?.text || ""))
        .join("")
    )
    .filter(Boolean)
    .map((t: string) => `<p>${t}</p>`)
    .join("");
};

const normalizeFromDoc = (doc: any) => {
  const layout = doc?.layout || [];
  const slider = layout.find((b: any) => /slider/i.test(b?.blockType));
  const slides = (slider?.locales || []).filter((l: any) => l?.locale === "de") || slider?.locales || [];
  return {
    title: doc?.title,
    buttonLabel: doc?.label_text,
    items: slides.map((s: any, index: number) => {
      const imageObj = s?.images?.[0]?.image || s?.images?.[0];
      return {
        name: "",
        textHtml: descriptionToHtml(s?.description),
        image: toMediaUrl(imageObj),
        imageAlt: imageObj?.alt || `Testimonial ${index + 1}`
      };
    }).filter((i: any) => i.textHtml || i.image)
  };
};

const TestimonialsBottom = () => {
  const [data, setData] = useState<{ title?: string; buttonLabel?: string; items: any[] }>({
    title: "Erfahrungsberichte von KundInnen",
    buttonLabel: "Feedback",
    items: []
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(API_URL, { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        const doc = json?.doc ?? json?.docs?.[0] ?? json;
        const norm = normalizeFromDoc(doc);
        if (!cancelled) setData((d) => ({ ...d, ...norm }));
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="testimonials-bottom-section">
      <div className="container">
        <div className="testimonials-header">
          <button className="btn fw-bold mb-3 btn-main px-5 py-3">{data.buttonLabel}</button>
          <h2 className="testimonials-title">{data.title}</h2>
        </div>
        <Swiper
          modules={[Pagination]}
          spaceBetween={32}
          slidesPerView={1}
          pagination={{ clickable: true }}
          breakpoints={{ 768: { slidesPerView: 2 }, 1200: { slidesPerView: 3 } }}
          className="testimonials-cards"
        >
          {/* ProvenExpert ProSeal Reviews Widget - First Slide */}
          <SwiperSlide key="proseal">
            <div className="testimonial-card">
              <ProvenExpertScript className="w-100" />
              <span className="testimonial-index">01</span>
            </div>
          </SwiperSlide>

          {/* First Testimonial */}
          {data.items.length > 0 && (
            <SwiperSlide key={0}>
              <div className="testimonial-card">
                {data.items[0].image && (
                  <div className="testimonial-image-wrap">
                    <Image
                      src={data.items[0].image}
                      alt={data.items[0].imageAlt}
                      width={200}
                      height={200}
                      className="testimonial-image"
                    />
                  </div>
                )}
                <p className="testimonial-text" dangerouslySetInnerHTML={{ __html: data.items[0].textHtml }} />
                <span className="testimonial-index">02</span>
              </div>
            </SwiperSlide>
          )}

          {/* Remaining Testimonials */}
          {data.items.slice(1).map((t, idx) => (
            <SwiperSlide key={idx + 1}>
              <div className="testimonial-card">
                {t.image && (
                  <div className="testimonial-image-wrap">
                    <Image
                      src={t.image}
                      alt={t.imageAlt}
                      width={200}
                      height={200}
                      className="testimonial-image"
                    />
                  </div>
                )}
                <p className="testimonial-text" dangerouslySetInnerHTML={{ __html: t.textHtml }} />
                <span className="testimonial-index">{`0${idx + 3}`}</span>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
};

export default TestimonialsBottom;
