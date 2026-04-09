import { consultaCPF } from './src/shared/lib/services/cpf.ts';

const result = await consultaCPF('31603566805');
console.log(JSON.stringify(result, null, 2));
