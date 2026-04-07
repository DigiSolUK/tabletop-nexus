import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { AppDatabase } from '../persistence/database';
import type { ExportRequest, ExportResult, MatchRecord } from '../../shared/contracts';

export class ExportService {
  constructor(
    private readonly exportDirectory: string,
    private readonly database: AppDatabase
  ) {
    mkdirSync(exportDirectory, { recursive: true });
  }

  async exportStats(request: ExportRequest): Promise<ExportResult> {
    const matches = this.selectMatches(request);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseName = request.gameId ? `${request.gameId}-${timestamp}` : `tabletop-nexus-${timestamp}`;

    if (request.format === 'json') {
      const path = join(this.exportDirectory, `${baseName}.json`);
      writeFileSync(path, JSON.stringify({ request, matches, stats: this.database.getBootstrap('local').stats }, null, 2));
      return { path, format: 'json' };
    }

    if (request.format === 'csv') {
      const headers = ['id', 'gameId', 'mode', 'outcome', 'durationSeconds', 'createdAt', 'completionSummary', 'playerOutcomes'];
      const lines = [
        headers.join(','),
        ...matches.map((match) =>
          [
            match.id,
            match.gameId,
            match.mode,
            match.outcome,
            match.durationSeconds,
            match.createdAt,
            match.completionSummary ?? '',
            JSON.stringify(match.playerOutcomes),
          ]
            .map((value) => `"${String(value).replaceAll('"', '""')}"`)
            .join(',')
        ),
      ];
      const path = join(this.exportDirectory, `${baseName}.csv`);
      writeFileSync(path, lines.join('\n'));
      return { path, format: 'csv' };
    }

    const path = join(this.exportDirectory, `${baseName}.pdf`);
    const document = await PDFDocument.create();
    const page = document.addPage([700, 900]);
    const font = await document.embedFont(StandardFonts.Helvetica);
    const stats = this.database.getBootstrap('local').stats;
    const lines = [
      'TableTop Nexus Stats Export',
      `Scope: ${request.scope}`,
      `Generated: ${new Date().toLocaleString()}`,
      '',
      `Total matches: ${stats.global.totalGamesPlayed}`,
      `Wins / Losses / Draws: ${stats.global.totalWins} / ${stats.global.totalLosses} / ${stats.global.totalDraws}`,
      `Favourite game: ${stats.global.favouriteGameId ?? 'N/A'}`,
      '',
      ...matches.slice(0, 18).map(
        (match) => `${match.gameName} | ${match.mode} | ${match.outcome} | ${match.durationSeconds}s`
      ),
    ];
    let y = 860;
    for (const line of lines) {
      page.drawText(line, { x: 48, y, size: 14, font, color: rgb(0.12, 0.12, 0.18) });
      y -= 28;
    }
    writeFileSync(path, Buffer.from(await document.save()));
    return { path, format: 'pdf' };
  }

  private selectMatches(request: ExportRequest): MatchRecord[] {
    const matches = this.database.getMatchRecords();
    if (request.scope === 'game' && request.gameId) {
      return matches.filter((match) => match.gameId === request.gameId);
    }
    return matches;
  }
}
