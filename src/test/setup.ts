import { installDomStubs } from '@/test/domStubs';

/**
 * Läuft vor jeder Testdatei.
 *
 * Die Stummel müssen hier stehen und nicht im Test: Die Stores lesen
 * `matchMedia` schon beim Import — ein `beforeAll` käme zu spät, weil
 * ES-Module vor allem anderen ausgewertet werden.
 *
 * Die Bibliothekstests laufen weiter in der Node-Umgebung, in der es kein
 * `window` gibt; für sie ist hier nichts zu tun.
 */
if (typeof window !== 'undefined') installDomStubs();
