import { useRef, useEffect, useState } from "react";
import { Stage, Layer, Image, Transformer } from "react-konva";
import useImage from "use-image";
import carSvg from "./assets/car.svg";
import type Konva from "konva";

const MAX_SIZE = 150;

function DraggableCar() {
  const [image] = useImage(carSvg);
  const imageRef = useRef<Konva.Image>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  // Derive display size from the SVG's natural dimensions, capped at MAX_SIZE
  const naturalW = image?.naturalWidth ?? 0;
  const naturalH = image?.naturalHeight ?? 0;
  const scale = naturalW && naturalH
    ? Math.min(MAX_SIZE / naturalW, MAX_SIZE / naturalH)
    : 1;
  const width = naturalW * scale;
  const height = naturalH * scale;

  useEffect(() => {
    if (transformerRef.current && imageRef.current) {
      transformerRef.current.nodes([imageRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [image]);

  return (
    <>
      <Image
        ref={imageRef}
        image={image}
        x={100}
        y={100}
        width={width}
        height={height}
        offsetX={width / 2}
        offsetY={height / 2}
        draggable
      />
      <Transformer
        ref={transformerRef}
        enabledAnchors={[]}
        rotateEnabled={true}
        borderStroke="#3b82f6"
        borderStrokeWidth={2}
        anchorStroke="#3b82f6"
        anchorFill="#fff"
        anchorSize={10}
      />
    </>
  );
}

export default function CarDrawing() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 600, height: 500 });

  useEffect(() => {
    const obs = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }
    });
    if (containerRef.current) {
      obs.observe(containerRef.current);
    }
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full">
      <Stage
        width={size.width}
        height={size.height}
        style={{ background: "#1e293b", borderRadius: "0.5rem" }}
      >
        <Layer>
          <DraggableCar />
        </Layer>
      </Stage>
    </div>
  );
}
