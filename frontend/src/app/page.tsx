import { redirect } from 'next/navigation';

/** La página de inicio redirige a la bandeja de entrada. */
export default function Inicio() {
  redirect('/bandeja');
}
