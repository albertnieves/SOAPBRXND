'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <>
      <h1>Se ha parado el centrifugado</h1>
      <p className="tk-lede">No hemos podido cargar esta página. No se ha cobrado nada.</p>
      <p><button className="tk-btn" onClick={() => reset()}>Volver a intentarlo</button></p>
    </>
  );
}
