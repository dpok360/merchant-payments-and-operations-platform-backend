import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as readline from 'readline';
import { User } from '../../users/entities/user.entity.js';
import { Role } from '../../users/enums/role.enum.js';

if (process.env.NODE_ENV === 'production') {
  console.error('seed:dev cannot run in production');
  process.exit(1);
}

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: false,
  entities: [User],
});

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

const SEED_USERS: { email: string; role: Role; firstName: string; lastName: string }[] = [
  { email: 'admin@example.com', role: Role.ADMIN, firstName: 'Admin', lastName: 'User' },
  { email: 'reviewer1@example.com', role: Role.REVIEWER, firstName: 'Reviewer', lastName: 'One' },
  { email: 'reviewer2@example.com', role: Role.REVIEWER, firstName: 'Reviewer', lastName: 'Two' },
  { email: 'sales1@example.com', role: Role.SALES, firstName: 'Sales', lastName: 'One' },
  { email: 'sales2@example.com', role: Role.SALES, firstName: 'Sales', lastName: 'Two' },
];

async function run() {
  await dataSource.initialize();
  const repo = dataSource.getRepository(User);
  const rounds = parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10);

  console.log('\nDev seed — enter passwords for each user (leave blank to skip if already exists)\n');

  for (const seed of SEED_USERS) {
    const existing = await repo.findOne({ where: { email: seed.email } });
    if (existing) {
      console.log(`  ✓ ${seed.email} already exists — skipping`);
      continue;
    }

    const password = await prompt(`  Password for ${seed.email} (${seed.role}): `);
    if (!password) {
      console.log(`  ⚠ Skipped ${seed.email} — no password provided`);
      continue;
    }

    const passwordHash = await bcrypt.hash(password, rounds);
    const user = repo.create({ ...seed, passwordHash });
    await repo.save(user);
    console.log(`  ✓ Created ${seed.email}`);
  }

  await dataSource.destroy();
  console.log('\nSeed complete.\n');
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
