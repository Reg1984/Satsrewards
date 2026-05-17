import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Calendar, Views, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addHours, addDays, startOfDay, endOfDay, addMonths } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Plus, CreditCard as Edit2, Trash2, Calendar as CalendarIcon, Filter, RefreshCw, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { EventModal } from './EventModal';
import { toast } from 'sonner';
import { TimetableEvent } from '../../types/timetable';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTimetableEvents, createTimetableEvent, updateTimetableEvent, deleteTimetableEvent, fetchTeacherClasses } from '../../services/timetableService';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { 'en-US': enUS },
});

// Memoized custom toolbar component
const CustomToolbar = React.memo(({ label, onNavigate, onView, selectedClass, setSelectedClass, classes, classesLoading, eventsLoading, refetchEvents, view }: any) => (
  <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
    <div className="flex items-center space-x-2">
      <button
        onClick={() => onNavigate('TODAY')}
        className="px-3 py-1.5 bg-white text-gray-700 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
      >
        Today
      </button>
      <button
        onClick={() => onNavigate('PREV')}
        className="px-2 py-1.5 bg-white text-gray-700 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
      >
        &lt;
      </button>
      <button
        onClick={() => onNavigate('NEXT')}
        className="px-2 py-1.5 bg-white text-gray-700 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
      >
        &gt;
      </button>
      <h3 className="text-lg font-semibold text-gray-900 ml-2">{label}</h3>
    </div>
    
    <div className="flex items-center space-x-2">
      <div className="relative">
        <select
          value={selectedClass || ''}
          onChange={(e) => setSelectedClass(e.target.value || null)}
          className="pl-8 pr-4 py-1.5 bg-white text-gray-700 border border-gray-300 rounded-md text-sm hover:bg-gray-50 appearance-none"
          disabled={classesLoading}
        >
          <option value="">All Classes</option>
          {classes.map((classId: string) => (
            <option key={classId} value={classId}>{classId}</option>
          ))}
        </select>
        <Filter className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
      </div>
      
      <button
        onClick={() => refetchEvents()}
        className="px-3 py-1.5 bg-white text-gray-700 border border-gray-300 rounded-md text-sm hover:bg-gray-50 flex items-center"
        disabled={eventsLoading}
      >
        {eventsLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
      </button>
      
      <div className="border-l border-gray-300 h-8 mx-1"></div>
      
      <button
        onClick={() => onView('month')}
        className={`px-3 py-1.5 rounded-md text-sm ${
          view === 'month' 
            ? 'bg-orange-500 text-white' 
            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
        }`}
      >
        Month
      </button>
      <button
        onClick={() => onView('week')}
        className={`px-3 py-1.5 rounded-md text-sm ${
          view === 'week' 
            ? 'bg-orange-500 text-white' 
            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
        }`}
      >
        Week
      </button>
      <button
        onClick={() => onView('day')}
        className={`px-3 py-1.5 rounded-md text-sm ${
          view === 'day' 
            ? 'bg-orange-500 text-white' 
            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
        }`}
      >
        Day
      </button>
      <button
        onClick={() => onView('agenda')}
        className={`px-3 py-1.5 rounded-md text-sm ${
          view === 'agenda' 
            ? 'bg-orange-500 text-white' 
            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
        }`}
      >
        Agenda
      </button>
    </div>
  </div>
));

// Prevent unnecessary re-renders
CustomToolbar.displayName = 'CustomToolbar';

// Memoized event component for better performance
const EventComponent = React.memo(({ event }: { event: TimetableEvent }) => (
  <div>
    <div className="font-medium">{event.title}</div>
    {event.location && <div className="text-xs">{event.location}</div>}
  </div>
));

EventComponent.displayName = 'EventComponent';

export function Timetable() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<TimetableEvent | null>(null);
  const [view, setView] = useState(Views.WEEK);
  const [date, setDate] = useState(new Date());
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [visibleRange, setVisibleRange] = useState({
    start: startOfDay(addDays(new Date(), -7)),
    end: endOfDay(addDays(new Date(), 30))
  });

  // Fetch classes taught by the teacher
  const { 
    data: classes = [],
    isLoading: classesLoading
  } = useQuery({
    queryKey: ['teacher-classes', user?.id],
    queryFn: () => fetchTeacherClasses(user?.id || ''),
    enabled: !!user?.id && user?.role === 'teacher',
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch timetable events
  const { 
    data: events = [],
    isLoading: eventsLoading,
    refetch: refetchEvents
  } = useQuery({
    queryKey: ['timetable-events', user?.id, visibleRange.start, visibleRange.end, selectedClass],
    queryFn: () => fetchTimetableEvents(
      user?.id || '',
      visibleRange.start,
      visibleRange.end,
      selectedClass || undefined
    ),
    enabled: !!user?.id && user?.role === 'teacher',
    staleTime: 60 * 1000, // 1 minute
  });

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: (event: TimetableEvent) => createTimetableEvent(event, user?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable-events'] });
      toast.success('Event created successfully');
      setIsModalOpen(false);
      setSelectedEvent(null);
    }
  });

  // Update event mutation
  const updateEventMutation = useMutation({
    mutationFn: (event: TimetableEvent) => updateTimetableEvent(event, user?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable-events'] });
      toast.success('Event updated successfully');
      setIsModalOpen(false);
      setSelectedEvent(null);
    }
  });

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: (eventId: string) => deleteTimetableEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable-events'] });
      toast.success('Event deleted successfully');
      setIsModalOpen(false);
      setSelectedEvent(null);
    }
  });

  // Update visible range when view or date changes
  useEffect(() => {
    let start: Date;
    let end: Date;
    
    switch (view) {
      case Views.DAY:
        start = startOfDay(date);
        end = endOfDay(date);
        break;
      case Views.WEEK:
        start = startOfDay(startOfWeek(date));
        end = endOfDay(addDays(start, 6));
        break;
      case Views.MONTH:
        start = startOfDay(startOfWeek(startOfDay(date)));
        end = endOfDay(addDays(start, 41)); // 6 weeks to ensure we cover the month
        break;
      case Views.AGENDA:
        start = startOfDay(date);
        end = endOfDay(addMonths(date, 1));
        break;
      default:
        start = startOfDay(date);
        end = endOfDay(addDays(date, 30));
    }
    
    setVisibleRange({ start, end });
  }, [view, date]);

  // Handle event selection
  const handleSelectEvent = useCallback((event: TimetableEvent) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  }, []);

  // Handle slot selection (creating a new event)
  const handleSelectSlot = useCallback(({ start, end }: { start: Date; end: Date }) => {
    setSelectedEvent({
      id: '',
      title: '',
      start,
      end,
      classId: selectedClass || user?.classId,
      type: 'class'
    });
    setIsModalOpen(true);
  }, [selectedClass, user?.classId]);

  // Handle saving an event
  const handleSaveEvent = (event: TimetableEvent) => {
    if (event.id) {
      // Update existing event
      updateEventMutation.mutate(event);
    } else {
      // Create new event
      createEventMutation.mutate(event);
    }
  };

  // Handle deleting an event
  const handleDeleteEvent = (eventId: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      deleteEventMutation.mutate(eventId);
    }
  };

  // Memoize event style getter to prevent unnecessary recalculations
  const eventStyleGetter = useCallback((event: TimetableEvent) => {
    let className = '';
    
    // Add class based on event type
    switch (event.type) {
      case 'class':
        className = 'event-class';
        break;
      case 'meeting':
        className = 'event-meeting';
        break;
      case 'exam':
        className = 'event-exam';
        break;
      case 'other':
        className = 'event-other';
        break;
    }
    
    // Add class for recurring events
    if (event.metadata?.isRecurringInstance) {
      className += ' recurring-event';
    }
    
    return {
      className
    };
  }, []);

  // Memoize formats to prevent unnecessary recalculations
  const formats = useMemo(() => ({
    timeGutterFormat: (date: Date) => format(date, 'HH:mm'),
    dayFormat: (date: Date) => format(date, 'EEE dd/MM'),
    eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) => 
      `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`
  }), []);

  // Memoize tooltip accessor to prevent unnecessary recalculations
  const tooltipAccessor = useCallback((event: TimetableEvent) => {
    let tooltip = event.title;
    if (event.location) tooltip += `\nLocation: ${event.location}`;
    if (event.classId) tooltip += `\nClass: ${event.classId}`;
    if (event.description) tooltip += `\n${event.description}`;
    if (event.metadata?.isRecurringInstance) tooltip += '\n(Recurring event)';
    return tooltip;
  }, []);

  // Memoize components to prevent unnecessary re-renders
  const components = useMemo(() => ({
    toolbar: (toolbarProps: any) => (
      <CustomToolbar 
        {...toolbarProps} 
        selectedClass={selectedClass} 
        setSelectedClass={setSelectedClass} 
        classes={classes} 
        classesLoading={classesLoading} 
        eventsLoading={eventsLoading} 
        refetchEvents={refetchEvents}
        view={view}
      />
    ),
    event: EventComponent
  }), [selectedClass, classes, classesLoading, eventsLoading, refetchEvents, view]);

  // Memoize events to prevent unnecessary re-renders
  const memoizedEvents = useMemo(() => events, [events]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <CalendarIcon className="h-5 w-5 text-orange-500" />
          <h2 className="text-lg font-semibold text-gray-900">Class Timetable</h2>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setSelectedEvent({
                id: '',
                title: '',
                start: new Date(),
                end: addHours(new Date(), 1),
                classId: selectedClass || user?.classId,
                type: 'class'
              });
              setIsModalOpen(true);
            }}
            className="flex items-center px-3 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Event
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 h-[700px]">
        {eventsLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
            <span className="ml-2 text-gray-600">Loading timetable...</span>
          </div>
        ) : (
          <Calendar
            localizer={localizer as any}
            events={memoizedEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            selectable
            view={view}
            onView={setView as any}
            date={date}
            onNavigate={setDate}
            eventPropGetter={eventStyleGetter}
            views={['month', 'week', 'day', 'agenda']}
            defaultView={Views.WEEK}
            components={components}
            formats={formats}
            popup
            tooltipAccessor={tooltipAccessor}
            dayLayoutAlgorithm="no-overlap"
            longPressThreshold={20}
          />
        )}
      </div>

      {isModalOpen && (
        <EventModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedEvent(null);
          }}
          event={selectedEvent}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
        />
      )}
    </div>
  );
}