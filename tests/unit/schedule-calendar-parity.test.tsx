import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ScheduleCalendar from '../../apps/admin-spa/src/components/schedule/ScheduleCalendar';

describe('ScheduleCalendar Parity & Regression Tests', () => {
  const referenceDate = new Date('2026-10-07T12:00:00+07:00');

  it('renders days starting on Monday (T2) through Sunday (CN) in Vietnamese', () => {
    const { container } = render(
      <ScheduleCalendar
        initialEvents={[]}
        userId="admin"
        isAdmin={true}
        defaultDate={referenceDate}
      />
    );

    const headerCells = container.querySelectorAll('.rbc-header');
    expect(headerCells.length).toBe(7);

    // Monday to Sunday in Vietnamese
    expect(headerCells[0].textContent).toContain('05 T2');
    expect(headerCells[1].textContent).toContain('06 T3');
    expect(headerCells[2].textContent).toContain('07 T4');
    expect(headerCells[3].textContent).toContain('08 T5');
    expect(headerCells[4].textContent).toContain('09 T6');
    expect(headerCells[5].textContent).toContain('10 T7');
    expect(headerCells[6].textContent).toContain('11 CN');
  });

  it('renders toolbar month and week range header in Vietnamese', () => {
    const { container } = render(
      <ScheduleCalendar
        initialEvents={[]}
        userId="admin"
        isAdmin={true}
        defaultDate={referenceDate}
      />
    );

    const toolbarLabel = container.querySelector('.rbc-toolbar-label');
    expect(toolbarLabel).toBeTruthy();
    expect(toolbarLabel?.textContent?.toLowerCase()).toContain('tháng 10');
  });

  it('renders overlapping events with no-overlap layout and senior crown badge', () => {
    const events = [
      {
        id: 1,
        title: 'Phượng',
        start: '2026-10-07T01:00:00.000Z', // 08:00 VN
        end: '2026-10-07T05:00:00.000Z',   // 12:00 VN
        userId: 'user-1',
        isSenior: false,
      },
      {
        id: 2,
        title: 'Trang',
        start: '2026-10-07T02:00:00.000Z', // 09:00 VN
        end: '2026-10-07T07:00:00.000Z',   // 14:00 VN
        userId: 'user-2',
        isSenior: true, // Senior shift
      },
      {
        id: 3,
        title: 'Uyên',
        start: '2026-10-07T05:00:00.000Z', // 12:00 VN
        end: '2026-10-07T10:00:00.000Z',   // 17:00 VN
        userId: 'user-3',
        isSenior: false,
      },
    ];

    const { container } = render(
      <ScheduleCalendar
        initialEvents={events}
        userId="admin"
        isAdmin={true}
        defaultDate={referenceDate}
      />
    );

    // Event cards should exist in the document
    const eventCards = container.querySelectorAll('.rbc-event');
    expect(eventCards.length).toBe(3);

    // Senior shift should have crown badge
    const seniorBadge = container.querySelector('[title="Trưởng ca"]');
    expect(seniorBadge).toBeTruthy();
    expect(seniorBadge?.textContent).toContain('👑');

    // Names should be fully present in the rendered DOM
    expect(container.textContent).toContain('Phượng');
    expect(container.textContent).toContain('Trang');
    expect(container.textContent).toContain('Uyên');

    // Title element must have break-words and tooltip title attribute
    const titleElements = container.querySelectorAll('.break-words');
    expect(titleElements.length).toBeGreaterThanOrEqual(3);
  });
});
