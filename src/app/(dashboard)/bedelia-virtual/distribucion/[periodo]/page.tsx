import { notFound } from 'next/navigation';
import DistribucionDemo from '../../DistribucionDemo';

export default async function DistribucionDemoPage({
  params,
}: {
  params: Promise<{ periodo: string }>;
}) {
  const { periodo } = await params;

  if (periodo !== '1c' && periodo !== '2c') {
    notFound();
  }

  return <DistribucionDemo periodo={periodo} />;
}
