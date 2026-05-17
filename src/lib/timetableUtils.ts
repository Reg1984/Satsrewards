import { TimetableEvent, SupabaseEvent } from '../types/timetable';
import { RRule, RRuleSet, rrulestr } from 'rrule';
import { addDays, startOfDay, endOfDay, addMonths } from 'date-fns';

/**
 * Convert a Supabase event to a TimetableEvent
 */
export function mapSupabaseEventToTimetableEvent(event: SupabaseEvent): TimetableEvent {
  return {
    id: event.id,
    title: event.title,
    start: new Date(event.start_time),
    end: new Date(event.end_time),
    classId: event.class_id,
    location: event.location,
    description: event.description,
    allDay: event.all_day,
    type: event.event_type,
    recurrenceRule: event.recurrence_rule,
    metadata: event.metadata
  };
}

/**
 * Convert a TimetableEvent to a Supabase event
 */
export function mapTimetableEventToSupabaseEvent(event: TimetableEvent, teacherId: string): Omit<SupabaseEvent, 'created_at' | 'updated_at'> {
  return {
    id: event.id,
    teacher_id: teacherId,
    title: event.title,
    start_time: event.start.toISOString(),
    end_time: event.end.toISOString(),
    class_id: event.classId,
    location: event.location,
    description: event.description,
    event_type: event.type,
    recurrence_rule: event.recurrenceRule,
    all_day: event.allDay || false,
    metadata: event.metadata
  };
}

// Cache for recurring event instances to improve performance
const recurringEventCache = new Map<string, TimetableEvent[]>();

/**
 * Expand recurring events for a given date range
 */
export function expandRecurringEvents(
  events: TimetableEvent[],
  start: Date,
  end: Date
): TimetableEvent[] {
  // Create a cache key based on events, start, and end
  const cacheKey = `${events.map(e => e.id).join(',')}_${start.toISOString()}_${end.toISOString()}`;
  
  // Check if we have a cached result
  if (recurringEventCache.has(cacheKey)) {
    return recurringEventCache.get(cacheKey)!;
  }
  
  const expandedEvents: TimetableEvent[] = [];

  // First add all non-recurring events
  const nonRecurringEvents = events.filter(event => !event.recurrenceRule);
  expandedEvents.push(...nonRecurringEvents);

  // Then expand recurring events
  const recurringEvents = events.filter(event => !!event.recurrenceRule);
  
  recurringEvents.forEach(event => {
    if (!event.recurrenceRule) return;
    
    try {
      const rule = rrulestr(event.recurrenceRule);
      const eventStart = event.start;
      const duration = event.end.getTime() - event.start.getTime();
      
      // Get all occurrences between start and end dates
      const occurrences = rule.between(
        start,
        end,
        true
      );
      
      // Create an event for each occurrence
      occurrences.forEach(date => {
        const occurrenceStart = new Date(date);
        const occurrenceEnd = new Date(date.getTime() + duration);
        
        expandedEvents.push({
          ...event,
          id: `${event.id}_${date.toISOString()}`, // Create a unique ID for each occurrence
          start: occurrenceStart,
          end: occurrenceEnd,
          // Add a reference to the original event ID
          metadata: {
            ...(event.metadata || {}),
            originalEventId: event.id,
            isRecurringInstance: true
          }
        });
      });
    } catch (error) {
      console.error('Error expanding recurring event:', error);
    }
  });

  // Cache the result
  recurringEventCache.set(cacheKey, expandedEvents);
  
  // Limit cache size to prevent memory leaks
  if (recurringEventCache.size > 50) {
    const oldestKey = recurringEventCache.keys().next().value;
    recurringEventCache.delete(oldestKey);
  }

  return expandedEvents;
}

/**
 * Generate a recurrence rule string from options
 */
export function generateRecurrenceRule(options: {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval?: number;
  count?: number;
  until?: Date;
  byDay?: string[];
}): string {
  const rruleOptions: any = {
    freq: RRule[options.frequency],
    interval: options.interval || 1
  };

  if (options.count) {
    rruleOptions.count = options.count;
  }

  if (options.until) {
    rruleOptions.until = options.until;
  }

  if (options.byDay && options.byDay.length > 0) {
    rruleOptions.byweekday = options.byDay.map(day => {
      switch (day) {
        case 'MO': return RRule.MO;
        case 'TU': return RRule.TU;
        case 'WE': return RRule.WE;
        case 'TH': return RRule.TH;
        case 'FR': return RRule.FR;
        case 'SA': return RRule.SA;
        case 'SU': return RRule.SU;
        default: return RRule.MO;
      }
    });
  }

  return new RRule(rruleOptions).toString();
}

/**
 * Parse a recurrence rule string into options
 */
export function parseRecurrenceRule(rruleString: string) {
  try {
    const rrule = rrulestr(rruleString);
    const options = rrule.options;
    
    const frequency = options.freq === RRule.DAILY ? 'DAILY' :
                      options.freq === RRule.WEEKLY ? 'WEEKLY' :
                      options.freq === RRule.MONTHLY ? 'MONTHLY' :
                      'YEARLY';
    
    const result = {
      frequency,
      interval: options.interval || 1,
      count: options.count,
      until: options.until ? new Date(options.until) : undefined,
      byDay: options.byweekday?.map((day: any) => day.toString()) || []
    };
    
    return result;
  } catch (error) {
    console.error('Error parsing recurrence rule:', error);
    return {
      frequency: 'WEEKLY' as const,
      interval: 1,
      count: 10,
      byDay: ['MO']
    };
  }
}

/**
 * Get a human-readable description of a recurrence rule
 */
export function getRecurrenceDescription(rruleString: string): string {
  try {
    const rrule = rrulestr(rruleString);
    return rrule.toText();
  } catch (error) {
    console.error('Error getting recurrence description:', error);
    return 'Recurring event';
  }
}