import { redirect } from 'next/navigation';

type HomeSearchParams = { ref?: string; for?: string };

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<HomeSearchParams> | HomeSearchParams;
}) {
  const sp = searchParams instanceof Promise ? await searchParams : searchParams ?? {};
  const ref = sp.ref;
  const forReel = sp.for === 'reel' ? 'reel' : '';
  const q = new URLSearchParams();
  if (ref) q.set('ref', ref);
  if (forReel) q.set('for', forReel);
  const qs = q.toString();
  if (qs) {
    redirect(`/landing-page?${qs}`);
  }
  redirect('/landing-page');
}
