"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import Breadcrumbs from "@/components/Breadcrumbs";
import BookingWidgetModal from "@/components/BookingWidgetModal"; // ✅ Booking modal import

// Types
interface KeyValuePair {
  key: string;
  value: string;
  id: string;
}

interface AdditionalSection {
  title: string;
  description: string;
  benefits: string[];
  blockName: string;
  content?: string;
  image?: string;
  imageAlt?: string;
  keyValuePairs?: KeyValuePair[];
  showButton?: boolean;
  buttonText?: string;
  buttonUrl?: string;
}

interface Offer {
  title: string;
  subtitle: string;
  description: string;
  image: string;
  imageAlt?: string;
  benefits: string[];
  benefitsTitle: string;
  benefitsSubtitle?: string;
  buttonText?: string;
  buttonUrl?: string;
  buttonStyle?: string;
  hasButton?: boolean;
  additionalSections?: AdditionalSection[];
  seoTitle?: string;
  seoDescription?: string;
  seoImage?: string;
  seoKeywords?: string;
}

interface ApiBlock {
  blockType: string;
  blockName?: string;
  title?: string;
  description?: string;
  content?: string;
  text?: string;
  url?: string;
  style?: string;
  showButton?: boolean;
  buttonText?: string;
  buttonUrl?: string;
  image?: { url: string; alt?: string };
  keyValuePairs?: KeyValuePair[];
  buttons?: Array<{ text: string; url?: string; id: string }>;
}

interface ApiEntry {
  title?: string;
  subtitle?: string;
  content?: ApiBlock[];
  meta?: {
    title?: string;
    description?: string;
    image?: { url?: string };
    keywords?: string;
  };
}

// Constants
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const PAGE_ID = "68d3cde26d8a2d983dc0df48";
const API_PARAMS = "depth=2&draft=false&locale=undefined&trash=false";
const API_URL = `${API_BASE_URL}/api/pages/${PAGE_ID}?${API_PARAMS}`;
const DEFAULT_IMAGE = "/images/misc/placeholder.jpg";

const BLOCK_TYPES = {
  CK_EDITOR: "ckEditorBlock",
  IMAGE: "imageBlock",
  BUTTON: "buttonContentBlock",
  TEXT_CONTENT: "textContentContentBlock",
  CONTENT_SHOWCASE: "contentShowcaseContentBlock",
} as const;

const BLOCK_NAMES = {
  SESSION_PREISE: "SessionPreise",
  SESSION_AB: "sessionAb",
  HINWEIS: "Hinweis",
  IMAGE_CONTENT: "image-content",
} as const;

// ------------------------
// Utility functions
// ------------------------
const normalizeSlug = (str: string): string =>
  str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const extractBenefitsFromHTML = (htmlContent: string): string[] => {
  const liMatches = htmlContent.match(/<li[^>]*>(.*?)<\/li>/g);
  return liMatches
    ? liMatches
        .map((li) => li.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").trim())
        .filter((text) => text.length > 0)
    : [];
};

const findBlockByType = (
  content: ApiBlock[] | undefined,
  blockType: string
): ApiBlock | undefined => content?.find((c) => c.blockType === blockType);

const findBlocksByType = (
  content: ApiBlock[] | undefined,
  blockType: string
): ApiBlock[] => content?.filter((c) => c.blockType === blockType) || [];

const extractSeoData = (entry: ApiEntry) => {
  const meta = entry.meta;
  return {
    seoTitle: meta?.title || entry.title || "",
    seoDescription: meta?.description || entry.subtitle || "",
    seoImage: meta?.image?.url || "",
    seoKeywords: meta?.keywords || "",
  };
};

// ------------------------
// Fetch Offer
// ------------------------
async function getOfferBySlug(slug: string): Promise<Offer | null> {
  if (!API_BASE_URL || !slug?.trim()) return null;
  try {
    const timestamp = Date.now();
    const apiUrl = `${API_URL}&timestamp=${timestamp}`;
    const res = await fetch(apiUrl, {
      cache: "no-store",
    });
    if (!res.ok) return null;

    const json = await res.json();
    const doc = json?.doc ?? json?.docs?.[0] ?? json;
    const layout = Array.isArray(doc?.layout) ? doc.layout : [];
    const normalizedSlug = normalizeSlug(slug);

    for (const block of layout) {
      const entry: ApiEntry = block?.locales?.[0];
      if (!entry?.title) continue;
      if (normalizeSlug(entry.title) === normalizedSlug) {
        return createOfferFromEntry(entry);
      }
    }
    return null;
  } catch (err) {
    console.error(err);
    return null;
  }
}

function createOfferFromEntry(entry: ApiEntry): Offer {
  const content = entry.content || [];
  const title = entry.title || "";
  return {
    title,
    subtitle: entry.subtitle || "",
    description: extractDescription(content),
    image: extractImage(content),
    imageAlt: extractImageAlt(content, title),
    benefits: [],
    benefitsTitle: "",
    benefitsSubtitle: "",
    ...extractButtonInfo(content),
    additionalSections: extractAdditionalSections(content),
    ...extractSeoData(entry),
  };
}

function extractDescription(content: ApiBlock[]): string {
  const imageContentBlock = content.find(
    (c) => c.blockType === BLOCK_TYPES.CK_EDITOR && c.blockName === BLOCK_NAMES.IMAGE_CONTENT
  );
  const ckEditorBlock = findBlockByType(content, BLOCK_TYPES.CK_EDITOR);
  return imageContentBlock?.content?.trim() || ckEditorBlock?.content?.trim() || "";
}

function extractImage(content: ApiBlock[]): string {
  return findBlockByType(content, BLOCK_TYPES.IMAGE)?.image?.url || DEFAULT_IMAGE;
}

function extractImageAlt(content: ApiBlock[], fallbackTitle: string = ""): string {
  const imageBlock = findBlockByType(content, BLOCK_TYPES.IMAGE);
  return imageBlock?.image?.alt || fallbackTitle || "Service Image";
}

function extractButtonInfo(content: ApiBlock[]) {
  const buttonBlock = findBlockByType(content, BLOCK_TYPES.BUTTON);
  return {
    hasButton: !!buttonBlock,
    buttonText: buttonBlock?.text?.trim() || "",
    buttonUrl: buttonBlock?.url || "",
    buttonStyle: buttonBlock?.style || "",
  };
}

function extractAdditionalSections(content: ApiBlock[]): AdditionalSection[] {
  const textBlocks = findBlocksByType(content, BLOCK_TYPES.TEXT_CONTENT);
  const showcaseBlocks = findBlocksByType(content, BLOCK_TYPES.CONTENT_SHOWCASE);
  const sections: AdditionalSection[] = [];

  textBlocks.forEach((block) => sections.push(createSectionFromBlock(block)));
  showcaseBlocks.forEach((block) =>
    sections.push({
      ...createSectionFromBlock(block),
      image: block.image?.url || "",
      keyValuePairs: block.keyValuePairs || [],
    })
  );

  return sections;
}

function createSectionFromBlock(block: ApiBlock): AdditionalSection {
  const benefits = block.content ? extractBenefitsFromHTML(block.content) : [];
  const firstButton = block.buttons?.[0];
  const sectionTitle = block.title?.trim() || "";
  return {
    title: sectionTitle,
    description: block.description?.trim() || "",
    benefits,
    blockName: block.blockName || "",
    content: block.content || "",
    showButton: block.showButton || !!firstButton,
    buttonText: block.buttonText?.trim() || firstButton?.text?.trim() || "",
    buttonUrl: block.buttonUrl || firstButton?.url || "",
    image: block.image?.url,
    imageAlt: block.image?.alt || sectionTitle || "Section Image",
    keyValuePairs: block.keyValuePairs,
  };
}

// ------------------------
// Sections Components
// ------------------------
const SessionPreiseSection = ({
  section,
  sectionIndex,
    setBookingOpen,
}: {
  section: AdditionalSection;
  sectionIndex: number;
    setBookingOpen: (open: boolean) => void;
}) => (
  <section key={sectionIndex} className="pt-0 pb-8 price-sec">
    <div className="container" style={{ position: "relative", zIndex: 2 }}>
      <div className="new-session-box">
        <div className="row">
          <div className="col-lg-5 col-md-12">
            <div className="flex-1 d-flex flex-column justify-content-center align-items-center">
              <Image
                src={section.image || "/images/services/session-img.png"}
                alt={section.imageAlt || section.title || "Session Booking"}
                width={400}
                height={300}
                className="w-100 max-w-xs rounded-lg shadow-md"
              />
            </div>
          </div>
          <div className="col-lg-7 col-md-12">
            <div className="p-4 flex-1 d-flex flex-column justify-content-center">
              <h2 className="h2 fw-bold text-dark mb-4 text-left w-100">
                {section.title}:
              </h2>
              <ul className="fs-5 text-dark mb-0 w-100 list-unstyled">
                {section.keyValuePairs?.map((item, index) => (
                  <li key={item.id || index} className="mb-3 d-flex align-items-center gap-3">
                    <i className="bi bi-calendar4-range" style={{ fontSize: "0.8rem", color: "#000" }}></i>
                    <strong>{item.key}:</strong> {item.value}
                  </li>
                ))}
              </ul>
              {section.content && (
                <div className="mb-4 text-dark" style={{ fontSize: "1.1rem", lineHeight: "1.6" }}>
                  <div dangerouslySetInnerHTML={{ __html: section.content }} />
                </div>
              )}
              {section.showButton && section.buttonText && (
                <div className="mt-2">
                  <button className="btn btn-main px-4 py-2 fw-bold" onClick={() => setBookingOpen(true)}>
                    {section.buttonText}
                    <i className="bi bi-arrow-right ms-2 position-relative" style={{ top: "2px" }}></i>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const SessionAbSection = ({
  section,
  sectionIndex,
}: {
  section: AdditionalSection;
  sectionIndex: number;
  
}) => (
  <section key={sectionIndex} className="py-10 session-sec-bg position-relative text-dark" style={{ fontSize: "1.15rem", lineHeight: "1.7" }}>
    <span className="position-absolute top-20 start-0">
      <Image src="/images/bg-2-copyright.webp" width={393} height={625} alt="Background Copyright" />
    </span>
    <div className="container mx-auto">
      <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: "#143774" }}>
        {section.title.replace(":", "")}
      </h2>
      {section.description && (
        <div className="text-lg text-gray-700 mb-6 max-w-3xl mx-auto">
          <p>{section.description}</p>
        </div>
      )}
      <div className="text-lg text-gray-700 mb-8 max-w-3xl mx-auto">
        {section.content ? (
          <div dangerouslySetInnerHTML={{ __html: section.content.replace(/<ul[^>]*>[\s\S]*?<\/ul>/g, '').replace(/<li[^>]*>[\s\S]*?<\/li>/g, '').trim() }} />
        ) : (
          <p>Content coming soon...</p>
        )}
      </div>
      <div className="flex flex-col md:flex-row justify-center items-center gap-8 mt-6">
        {section.benefits.map((benefit, index) => (
          <div key={index} className="d-flex align-items-center gap-3">
            <span className="d-inline-flex align-items-center justify-content-center w-14 h-14 rounded-lg bg-gray-800 text-white">
              <i className="bi bi-x-diamond" style={{ fontSize: "1.5rem", color: "#7A566B" }}></i>
            </span>
            <span className="text-left text-lg text-gray-800">{benefit}</span>
          </div>
        ))}
      </div>
      {section.showButton && section.buttonText && (
        <div className="text-center mt-8">
          <a href={section.buttonUrl || "/contact"} className="btn btn-main px-6 py-3 fw-bold" style={{ fontSize: "1.1rem" }}>
            {section.buttonText}<i className="bi bi-arrow-right ms-2"></i>
          </a>
        </div>
      )}
    </div>
  </section>
);

const DefaultSection = ({
  section,
  sectionIndex,
  setBookingOpen,
}: {
  section: AdditionalSection;
  sectionIndex: number;
  setBookingOpen?: (open: boolean) => void;
}) => {
  if (!section.benefits?.length && !section.content) return null;
  return (
    <section key={sectionIndex} className="py-5 session-sec-bg-fe">
      <div className="container">
        <div className="row justify-content-center mb-4">
          <div className="col-lg-12 text-center">
            <h2 className="fw-bold mb-3" style={{ color: "#5C377D", fontSize: "2.1rem", letterSpacing: "1px" }}>
              {section.title.replace(":", "")}
            </h2>
            {section.description && <p className="lead" style={{ color: "#3D2C4A", fontWeight: "500" }}>{section.description}</p>}
          </div>
        </div>
        <div className="row justify-content-center">
          <div className="col-lg-12">
            {section.content && (
              <div className="content-section" style={{ fontSize: "1.18rem", color: "#2D1A3A", fontWeight: "500" }} dangerouslySetInnerHTML={{ __html: section.content }} />
            )}
            {section.showButton && section.buttonText && (
              <div className="mt-4">
                {section.buttonUrl ? (
                  <a href={section.buttonUrl} className="btn btn-main px-4 py-2 fw-bold" style={{ fontSize: "1.1rem" }}>
                    {section.buttonText}
                  </a>
                ) : (
                  <button className="btn btn-main px-4 py-2 fw-bold" style={{ fontSize: "1.1rem" }} onClick={() => setBookingOpen?.(true)}>
                    {section.buttonText}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

const HinweisSection = ({
  section,
  sectionIndex,
  setBookingOpen,
}: {
  section: AdditionalSection;
  sectionIndex: number;
  setBookingOpen: (open: boolean) => void;
}) => (
  <section key={`hinweis-${sectionIndex}`} className="py-8 bg-light stimmen-sec">
    <div className="container">
      <div className="row align-items-center justify-content-center">
        <div className="col-lg-12">
          <h2 className="fw-bold mb-3" style={{ color: "#2D1A3A", fontSize: "1.7rem", letterSpacing: "1px" }}>
            {section.title}
          </h2>
          <div className="mb-3" style={{ fontSize: "1.15rem", color: "#5C377D", fontWeight: "500" }}>
            {section.content && (
              <div dangerouslySetInnerHTML={{ __html: section.content.replace(/<blockquote>/g, '<blockquote class="mb-2" style="border-left: 4px solid #7A566B; padding-left: 16px; margin-bottom: 12px;">') }} />
            )}
          </div>
          {section.showButton && section.buttonText && (
            <div className="mt-4">
              <button type="button" className="btn btn-main px-4 py-2 fw-bold mb-2 d-none" onClick={() => setBookingOpen(true)}>
                {section.buttonText}<i className="bi bi-arrow-right"></i>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  </section>
);

// ------------------------
// Page Component
// ------------------------
const OfferSlugPage = ({ params }: { params: { slug: string } }) => {
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);

  useEffect(() => {
    const fetchOffer = async () => {
      try {
        const fetchedOffer = await getOfferBySlug(params.slug);
        setOffer(fetchedOffer);
      } catch (error) {
        console.error('Error fetching offer:', error);
        setOffer(null);
      } finally {
        setLoading(false);
      }
    };

    fetchOffer();
  }, [params.slug]);

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" style={{ width: "3rem", height: "3rem" }} role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          
          <p className="text-muted">Bitte warten Sie einen Moment</p>
        </div>
      </div>
    );
  }

  if (!offer) {
    return (
      <>
        <Breadcrumbs title="Offer Not Found" items={[{ label: "Home", href: "/" }, { label: "Offers", href: "/offer" }, { label: "Not Found" }]} />
        <main className="max-w-2xl mx-auto py-10 px-4">
          <h1 className="text-3xl font-bold mb-4 text-red-600">404 | No matching offer found</h1>
          <p className="mb-4">Requested slug: <strong>{params.slug}</strong></p>
          <p className="mb-4">Check your API data and slug normalization.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Breadcrumbs title={offer.title} items={[{ label: "Home", href: "/" }, { label: "Offers", href: "/offer" }, { label: offer.title }]} />

      <div className="container py-5 top-sec-offer-inner dark-color">
        <div className="d-flex flex-column flex-md-row align-items-center justify-content-center">
          <div className="mb-4 mb-md-0 me-md-4">
            <Image src={offer.image} alt={offer.imageAlt || offer.title} width={320} height={320} style={{ borderRadius: "12px" }} />
          </div>
          <div className="flex-grow-1">
            <h2 className="text-right fw-bold mb-2" style={{ color: "#1a2a6c" }}>{offer.title}</h2>
            <h4 className="text-right mb-3" style={{ color: "#4f8a8b" }}>{offer.subtitle}</h4>
            {offer.description && (
              <div className="mt-3 text-right">
                <div dangerouslySetInnerHTML={{ __html: offer.description }} />
              </div>
            )}
            {offer.hasButton && offer.buttonText && (
              <div className="d-none gap-3 mt-4">
                <a className={`btn ${offer.buttonStyle === "primary" ? "btn-main" : "btn-secondary"} px-4 py-2 fw-bold mb-2`} href={offer.buttonUrl}>
                  <i className="bi bi-calendar-check"></i> {offer.buttonText}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Render all sections */}
      {offer.additionalSections && offer.additionalSections.filter(sec => sec.blockName !== BLOCK_NAMES.HINWEIS).map((section, i) => {
        switch (section.blockName) {
          case BLOCK_NAMES.SESSION_PREISE:
            return <SessionPreiseSection key={i} section={section} sectionIndex={i} setBookingOpen={setBookingOpen} />;
          case BLOCK_NAMES.SESSION_AB:
            return <SessionAbSection key={i} section={section} sectionIndex={i} />;
          default:
            return <DefaultSection key={i} section={section} sectionIndex={i} setBookingOpen={setBookingOpen} />;
        }
      })}

      {offer.additionalSections && offer.additionalSections.filter(sec => sec.blockName === BLOCK_NAMES.HINWEIS).map((section, i) => (
        <HinweisSection key={`hinweis-${i}`} section={section} sectionIndex={i} setBookingOpen={setBookingOpen} />
      ))}

      {/* Booking Modal */}
      <BookingWidgetModal open={bookingOpen} onClose={() => setBookingOpen(false)} title={offer.title} />
    </>
  );
};

export default OfferSlugPage;
