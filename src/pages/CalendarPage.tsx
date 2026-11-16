import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/ui/Card/Card';

export function CalendarPage() {
  return (
    <div>
      <PageHeader
        iconName="calendar"
        title="Календарь"
      />

      <Card variant="solid">
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          Здесь будут ваши памятные даты, годовщины и напоминания.
        </p>
      </Card>
    </div>
  );
}
