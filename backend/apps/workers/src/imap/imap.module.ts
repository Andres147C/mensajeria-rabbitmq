import { Module } from '@nestjs/common';
import { ImapLectorService } from './imap-lector.service';

/** Lector IMAP: revisa Gmail periódicamente y publica en "correos.entrada". */
@Module({
  providers: [ImapLectorService],
})
export class ImapModule {}
