import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/ui/Card/Card';

export function GamesPage() {
  return (
    <div>
      <PageHeader
        iconName="sparkles"
        title="Игры"
      />

      <Card variant="solid">
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          Здесь будут ежедневные вопросы, челленджи и игры для пар.
        </p>
      </Card>
    </div>
  );
}
