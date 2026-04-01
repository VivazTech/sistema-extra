import Lottie from 'lottie-react';
import animationData from '../src/assets/lottie/spinner-snake-alt.json';

type Props = {
  /** Largura/altura em px (animação base 144×144). */
  size?: number;
  className?: string;
};

export function LoadingLottie({ size = 80, className = '' }: Props) {
  return (
    <div
      className={`flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Lottie animationData={animationData} loop style={{ width: size, height: size }} />
    </div>
  );
}

type DatabaseLoadingProps = {
  message?: string;
  minHeight?: string;
  className?: string;
  size?: number;
};

/** Spinner Lottie centralizado + mensagem (dados do banco / rede). */
export function DatabaseLoading({
  message = 'Carregando dados...',
  minHeight = 'min-h-[40vh]',
  className = '',
  size = 88,
}: DatabaseLoadingProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center px-4 ${minHeight} ${className}`}
      role="status"
      aria-live="polite"
    >
      <LoadingLottie size={size} />
      <p className="mt-4 text-sm font-medium text-gray-600">{message}</p>
    </div>
  );
}
