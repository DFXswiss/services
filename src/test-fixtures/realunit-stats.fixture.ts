import { RealunitStats } from 'src/dto/realunit.dto';

const period = (total: number, last30Days: number, last7Days: number) => ({ total, last30Days, last7Days });

export const realunitStatsFixture: RealunitStats = {
  updated: '2024-01-15T10:00:00.000Z',
  growth: {
    accounts: period(1200, 150, 40),
    wallets: period(1800, 220, 60),
  },
  kycFunnel: [
    { step: 'ContactData', reached: period(1000, 120, 30), completed: period(900, 110, 28) },
    { step: 'PersonalData', reached: period(800, 100, 25), completed: period(700, 90, 22) },
    { step: 'Ident', reached: period(600, 80, 20), completed: period(500, 70, 18) },
  ],
  registration: {
    started: period(1000, 130, 35),
    inReview: period(120, 20, 5),
    completed: period(820, 95, 24),
  },
  trading: {
    buyVolumeChf: period(500000, 60000, 15000),
    buyCount: period(300, 40, 10),
    sellVolumeChf: period(200000, 25000, 6000),
    sellCount: period(150, 18, 5),
  },
};
