"use client";

import React from "react";
import { useToPng } from "@hugocxl/react-to-image";
import {
  ArchitectureMapHighlightLayers,
  HighlightLayer,
} from "@principal-ai/code-city-react";
import { FileSuffixConfig } from "@/utils/fileColorMapping";

interface MapImageCaptureProps {
  cityData: any;
  highlightLayers: HighlightLayer[];
  canvasBackgroundColor?: string;
  onMapImageGenerated?: (imageBlob: Blob, imageUrl: string) => void;
  onGenerateMapImageRef?: React.MutableRefObject<(() => void) | null>;
  onFileClick?: (
    path: string,
    type: "file" | "directory",
    extension: string,
    config?: FileSuffixConfig,
  ) => void;
  className?: string;
}

export const MapImageCapture: React.FC<MapImageCaptureProps> = ({
  cityData,
  highlightLayers,
  canvasBackgroundColor = "#ffffff",
  onMapImageGenerated,
  onGenerateMapImageRef,
  onFileClick,
  className = "w-full h-full",
}) => {
  // Hook to convert just the map to PNG
  const [, convertToPng, mapRef] = useToPng<HTMLDivElement>({
    onSuccess: (data) => {
      console.log(
        "[MapImageCapture] onSuccess called, data length:",
        data?.length,
      );
      // Convert base64 data URL to Blob
      fetch(data)
        .then((res) => res.blob())
        .then((blob) => {
          console.log("[MapImageCapture] Blob created, size:", blob.size);
          if (onMapImageGenerated) {
            console.log(
              "[MapImageCapture] Calling onMapImageGenerated callback",
            );
            onMapImageGenerated(blob, data);
          } else {
            console.warn(
              "[MapImageCapture] No onMapImageGenerated callback provided",
            );
          }
        })
        .catch((err) => {
          console.error(
            "[MapImageCapture] Failed to convert data to blob:",
            err,
          );
        });
    },
    onError: (error) => {
      console.error("[MapImageCapture] Failed to convert map to image:", error);
    },
  });

  // Expose the generateImage function to parent via ref
  React.useEffect(() => {
    if (onGenerateMapImageRef) {
      console.log(
        "[MapImageCapture] Setting capture ref, convertToPng exists:",
        !!convertToPng,
      );
      onGenerateMapImageRef.current = () => {
        console.log("[MapImageCapture] Capture triggered via ref");
        convertToPng();
      };
    }
  }, [onGenerateMapImageRef, convertToPng]);

  // Handle file click
  const handleFileClick = (path: string, type: "file" | "directory") => {
    if (onFileClick) {
      if (type === "file") {
        const lastDot = path.lastIndexOf(".");
        if (lastDot !== -1 && lastDot !== path.length - 1) {
          const extension = path.substring(lastDot);
          onFileClick(path, type, extension);
        }
      } else {
        // For directories, pass empty extension
        onFileClick(path, type, "");
      }
    }
  };

  return (
    <div
      ref={mapRef}
      style={{
        backgroundColor: canvasBackgroundColor,
        border: "2px solid #e5e7eb",
        borderRadius: 0,
        overflow: "hidden",
        position: "relative",
      }}
      className={className}
    >
      {cityData ? (
        <ArchitectureMapHighlightLayers
          cityData={cityData}
          highlightLayers={highlightLayers}
          canvasBackgroundColor={canvasBackgroundColor}
          className="w-full h-full"
          onFileClick={handleFileClick}
        />
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            color: "#9ca3af",
            textAlign: "center",
            backgroundColor: canvasBackgroundColor,
          }}
        >
          <div>
            <p style={{ fontSize: "14px" }}>Map will appear here</p>
          </div>
        </div>
      )}
    </div>
  );
};
