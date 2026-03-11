"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    provenExpert?: {
      proSeal: (config: any) => void;
    };
  }
}

interface ProSealWidgetProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function ProvenExpertScript({ 
  className = "", 
  style = {} 
}: ProSealWidgetProps) {
  useEffect(() => {
    const loadProSeal = () => {
      if (window.provenExpert) {
        window.provenExpert.proSeal({
          widgetId: "87a3abec-7dc2-4ffc-82ee-5cbdf50561d6",
          language: "de-DE",
          usePageLanguage: false,
          bannerColor: "#097E88",
          textColor: "#FFFFFF",
          showBackPage: false,
          showReviews: true,
          hideDate: true,
          hideName: false,
          googleStars: true,
          displayReviewerLastName: false,
          embeddedSelector: "#proSealWidget"
        });
      }
    };

    // Create and load the ProSeal script
    const script = document.createElement("script");
    script.src = "https://s.provenexpert.net/seals/proseal-v2.js";
    script.async = true;
    script.onload = loadProSeal;
    document.head.appendChild(script);

    return () => {
      // Cleanup if needed
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return (
    <>
      {/* ProvenExpert ProSeal Widget Container */}
      <div
        id="proSealWidget"
        className={className}
        style={{
          minHeight: "300px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...style
        }}
      />
      
      {/* Fallback for users without JavaScript */}
      <noscript>
        <a
          href="https://www.provenexpert.com/traumafrei/?utm_source=seals&utm_campaign=embedded-proseal&utm_medium=profile&utm_content=87a3abec-7dc2-4ffc-82ee-5cbdf50561d6"
          target="_blank"
          rel="noopener noreferrer"
          title="Customer reviews & experiences for Traumafrei"
          className="pe-pro-seal-more-infos"
        >
          More info
        </a>
      </noscript>
    </>
  );
}