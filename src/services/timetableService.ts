import { supabase } from '../lib/supabase';
import { TimetableEvent, SupabaseEvent } from '../types/timetable';
import { mapSupabaseEventToTimetableEvent, mapTimetableEventToSupabaseEvent, expandRecurringEvents } from '../lib/timetableUtils';
import { toast } from 'sonner';
import { logError } from '../lib/errorLogging';

/**
 * Fetch timetable events for a teacher within a date range
 */
export async function fetchTimetableEvents(
  teacherId: string,
  start: Date,
  end: Date,
  classId?: string
): Promise<TimetableEvent[]> {
  try {
    let query = supabase
      .from('timetable_events')
      .select('*')
      .or(`teacher_id.eq.${teacherId},class_id.eq.${classId || ''}`)
      .gte('start_time', start.toISOString())
      .lte('end_time', end.toISOString());
    
    if (classId) {
      query = query.eq('class_id', classId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw error;
    }
    
    // Convert Supabase events to TimetableEvents
    const events = (data as SupabaseEvent[]).map(mapSupabaseEventToTimetableEvent);
    
    // Expand recurring events
    return expandRecurringEvents(events, start, end);
  } catch (error) {
    console.error('Error fetching timetable events:', error);
    logError(error as Error, { component: 'timetableService', action: 'fetchTimetableEvents' });
    toast.error('Failed to load timetable events');
    return [];
  }
}

/**
 * Create a new timetable event
 */
export async function createTimetableEvent(
  event: TimetableEvent,
  teacherId: string
): Promise<TimetableEvent | null> {
  try {
    const supabaseEvent = mapTimetableEventToSupabaseEvent(event, teacherId);
    
    const { data, error } = await supabase
      .from('timetable_events')
      .insert(supabaseEvent)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return mapSupabaseEventToTimetableEvent(data as SupabaseEvent);
  } catch (error) {
    console.error('Error creating timetable event:', error);
    logError(error as Error, { component: 'timetableService', action: 'createTimetableEvent' });
    toast.error('Failed to create event');
    return null;
  }
}

/**
 * Update an existing timetable event
 */
export async function updateTimetableEvent(
  event: TimetableEvent,
  teacherId: string
): Promise<TimetableEvent | null> {
  try {
    // Check if this is a recurring event instance
    const isRecurringInstance = event.metadata?.isRecurringInstance;
    const originalEventId = event.metadata?.originalEventId;
    
    if (isRecurringInstance && originalEventId) {
      // For recurring instances, we need to handle this differently
      // Options: update just this instance, update all future instances, or update all instances
      
      // For now, we'll just update the original event
      const { data: originalEvent, error: fetchError } = await supabase
        .from('timetable_events')
        .select('*')
        .eq('id', originalEventId)
        .single();
      
      if (fetchError) {
        throw fetchError;
      }
      
      // Update the original event with the new data
      const supabaseEvent = mapTimetableEventToSupabaseEvent({
        ...event,
        id: originalEventId
      }, teacherId);
      
      const { data, error } = await supabase
        .from('timetable_events')
        .update(supabaseEvent)
        .eq('id', originalEventId)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return mapSupabaseEventToTimetableEvent(data as SupabaseEvent);
    } else {
      // Regular event update
      const supabaseEvent = mapTimetableEventToSupabaseEvent(event, teacherId);
      
      const { data, error } = await supabase
        .from('timetable_events')
        .update(supabaseEvent)
        .eq('id', event.id)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return mapSupabaseEventToTimetableEvent(data as SupabaseEvent);
    }
  } catch (error) {
    console.error('Error updating timetable event:', error);
    logError(error as Error, { component: 'timetableService', action: 'updateTimetableEvent' });
    toast.error('Failed to update event');
    return null;
  }
}

/**
 * Delete a timetable event
 */
export async function deleteTimetableEvent(eventId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('timetable_events')
      .delete()
      .eq('id', eventId);
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting timetable event:', error);
    logError(error as Error, { component: 'timetableService', action: 'deleteTimetableEvent' });
    toast.error('Failed to delete event');
    return false;
  }
}

/**
 * Fetch classes taught by a teacher
 */
export async function fetchTeacherClasses(teacherId: string): Promise<string[]> {
  try {
    // First get the teacher's class
    const { data: teacherData, error: teacherError } = await supabase
      .from('profiles')
      .select('class_id')
      .eq('id', teacherId)
      .single();
    
    if (teacherError) {
      throw teacherError;
    }
    
    const teacherClassId = teacherData.class_id;
    
    if (!teacherClassId) {
      return [];
    }
    
    // Then get all unique class IDs from timetable events
    const { data: eventData, error: eventError } = await supabase
      .from('timetable_events')
      .select('class_id')
      .eq('teacher_id', teacherId)
      .not('class_id', 'is', null);
    
    if (eventError) {
      throw eventError;
    }
    
    // Combine and deduplicate
    const classIds = [
      teacherClassId,
      ...eventData.map(event => event.class_id)
    ].filter(Boolean);
    
    return [...new Set(classIds)];
  } catch (error) {
    console.error('Error fetching teacher classes:', error);
    logError(error as Error, { component: 'timetableService', action: 'fetchTeacherClasses' });
    toast.error('Failed to load classes');
    return [];
  }
}