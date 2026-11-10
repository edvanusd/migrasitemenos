/** Static stand-in while the 3D scene loads, or when WebGL is unavailable. */
export function SceneFallback({ compact = false, loading = false }: { compact?: boolean; loading?: boolean }) {
  const cls = ["scene3d", compact ? "scene3d--compact" : "", loading ? "scene3d--loading" : "scene3d--fallback"].filter(Boolean).join(" ");
  return (
    <div className={cls}>
      {!loading && (
        <div className="scene3d-flow">
          <span>Sistem legacy</span><span aria-hidden="true">→</span>
          <span>Staging</span><span aria-hidden="true">→</span>
          <span>Temenos T24</span>
        </div>
      )}
    </div>
  );
}
