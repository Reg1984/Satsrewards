import React, { useState, useEffect, useMemo } from 'react';
import { X, Trash2, Calendar, Clock, MapPin, FileText, Repeat, AlertTriangle } from 'lucide-react';
import { format, parse } from 'date-fns';
import { TimetableEvent, RecurrenceOptions } from '../../types/timetable';
import { RRule, Weekday } from 'rrule';
import { toast } from 'sonner';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: TimetableEvent | null;
  onSave: (event: TimetableEvent) => void;
  onDelete: (eventId: string) => void;
}

export function EventModal({ isOpen, onClose, event, onSave, onDelete }: EventModalProps) {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [classId, setClassId] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'class' | 'meeting' | 'exam' | 'other'>('class');
  const [allDay, setAllDay] = useState(false);
  const [hasRecurrence, setHasRecurrence] = useState(false);
  const [recurrenceOptions, setRecurrenceOptions] = useState<RecurrenceOptions>({
    frequency: 'WEEKLY',
    interval: 1,
    count: 10,
    byDay: ['MO']
  });

  // Reset form when event changes
  useEffect(() => {
    if (event) {
      setTitle(event.title || '');
      setStartDate(format(event.start, 'yyyy-MM-dd'));
      setStartTime(format(event.start, 'HH:mm'));
      setEndDate(format(event.end, 'yyyy-MM-dd'));
      setEndTime(format(event.end, 'HH:mm'));
      setClassId(event.classId || '');
      setLocation(event.location || '');
      setDescription(event.description || '');
      setType(event.type || 'class');
      setAllDay(event.allDay || false);
      
      // Parse recurrence rule if it exists
      if (event.recurrenceRule) {
        setHasRecurrence(true);
        try {
          const rrule = RRule.fromString(event.recurrenceRule);
          
          // Extract frequency
          const freqMap: Record<number, 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'> = {
            [RRule.DAILY]: 'DAILY',
            [RRule.WEEKLY]: 'WEEKLY',
            [RRule.MONTHLY]: 'MONTHLY',
            [RRule.YEARLY]: 'YEARLY'
          };
          
          const newOptions: RecurrenceOptions = {
            frequency: freqMap[rrule.options.freq] || 'WEEKLY',
            interval: rrule.options.interval || 1,
            count: rrule.options.count,
            until: rrule.options.until ? new Date(rrule.options.until) : undefined,
            byDay: rrule.options.byweekday?.map((day: Weekday) => day.toString()) || []
          };
          
          setRecurrenceOptions(newOptions);
        } catch (error) {
          console.error('Error parsing recurrence rule:', error);
          toast.error('Failed to parse recurrence rule');
        }
      } else {
        setHasRecurrence(false);
        setRecurrenceOptions({
          frequency: 'WEEKLY',
          interval: 1,
          count: 10,
          byDay: ['MO']
        });
      }
    }
  }, [event]);

  // Memoize the weekday options to prevent unnecessary re-renders
  const weekdayOptions = useMemo(() => [
    { value: 'MO', label: 'Mon' },
    { value: 'TU', label: 'Tue' },
    { value: 'WE', label: 'Wed' },
    { value: 'TH', label: 'Thu' },
    { value: 'FR', label: 'Fri' },
    { value: 'SA', label: 'Sat' },
    { value: 'SU', label: 'Sun' }
  ], []);

  // Memoize the event type options to prevent unnecessary re-renders
  const eventTypeOptions = useMemo(() => [
    { value: 'class', label: 'Class' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'exam', label: 'Exam' },
    { value: 'other', label: 'Other' }
  ], []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const startDateTime = new Date(`${startDate}T${startTime}`);
      const endDateTime = new Date(`${endDate}T${endTime}`);
      
      if (startDateTime >= endDateTime) {
        toast.error('End time must be after start time');
        return;
      }
      
      // Generate recurrence rule if needed
      let recurrenceRule: string | undefined;
      if (hasRecurrence) {
        try {
          const rruleOptions: any = {
            freq: RRule[recurrenceOptions.frequency],
            interval: recurrenceOptions.interval
          };
          
          if (recurrenceOptions.count) {
            rruleOptions.count = recurrenceOptions.count;
          }
          
          if (recurrenceOptions.until) {
            rruleOptions.until = recurrenceOptions.until;
          }
          
          if (recurrenceOptions.byDay && recurrenceOptions.byDay.length > 0) {
            rruleOptions.byweekday = recurrenceOptions.byDay.map(day => {
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
          
          const rrule = new RRule(rruleOptions);
          recurrenceRule = rrule.toString();
        } catch (error) {
          console.error('Error creating recurrence rule:', error);
          toast.error('Failed to create recurrence rule');
          return;
        }
      }
      
      const updatedEvent: TimetableEvent = {
        id: event?.id || '',
        title,
        start: startDateTime,
        end: endDateTime,
        classId: classId || undefined,
        location: location || undefined,
        description: description || undefined,
        type,
        allDay,
        recurrenceRule
      };
      
      onSave(updatedEvent);
    } catch (error) {
      console.error('Error submitting event:', error);
      toast.error('Failed to save event');
    }
  };

  const handleDayToggle = (day: string) => {
    const currentDays = [...(recurrenceOptions.byDay || [])];
    if (currentDays.includes(day)) {
      setRecurrenceOptions({
        ...recurrenceOptions,
        byDay: currentDays.filter(d => d !== day)
      });
    } else {
      setRecurrenceOptions({
        ...recurrenceOptions,
        byDay: [...currentDays, day]
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {event?.id ? 'Edit Event' : 'Create Event'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
              required
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="all-day"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
            />
            <label htmlFor="all-day" className="ml-2 block text-sm text-gray-900">
              All day event
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                <Calendar className="h-4 w-4 inline mr-1" />
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                required
              />
            </div>
            {!allDay && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Start Time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                  required
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                <Calendar className="h-4 w-4 inline mr-1" />
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                required
              />
            </div>
            {!allDay && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  <Clock className="h-4 w-4 inline mr-1" />
                  End Time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                  required
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Event Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
            >
              {eventTypeOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              <MapPin className="h-4 w-4 inline mr-1" />
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
              placeholder="Optional"
            />
          </div>

          {type === 'class' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Class ID
              </label>
              <input
                type="text"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                placeholder="e.g. 10A"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              <FileText className="h-4 w-4 inline mr-1" />
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
              rows={3}
              placeholder="Optional"
            />
          </div>

          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700 flex items-center">
                <Repeat className="h-4 w-4 mr-1" />
                Recurring Event
              </label>
              <input
                type="checkbox"
                checked={hasRecurrence}
                onChange={(e) => setHasRecurrence(e.target.checked)}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
              />
            </div>

            {hasRecurrence && (
              <div className="mt-3 space-y-3 pl-4 border-l-2 border-orange-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Frequency
                  </label>
                  <select
                    value={recurrenceOptions.frequency}
                    onChange={(e) => setRecurrenceOptions({
                      ...recurrenceOptions,
                      frequency: e.target.value as any
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Repeat every
                  </label>
                  <div className="flex items-center mt-1">
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={recurrenceOptions.interval}
                      onChange={(e) => setRecurrenceOptions({
                        ...recurrenceOptions,
                        interval: parseInt(e.target.value) || 1
                      })}
                      className="block w-16 rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                    />
                    <span className="ml-2 text-sm text-gray-500">
                      {recurrenceOptions.frequency === 'DAILY' && 'day(s)'}
                      {recurrenceOptions.frequency === 'WEEKLY' && 'week(s)'}
                      {recurrenceOptions.frequency === 'MONTHLY' && 'month(s)'}
                      {recurrenceOptions.frequency === 'YEARLY' && 'year(s)'}
                    </span>
                  </div>
                </div>

                {recurrenceOptions.frequency === 'WEEKLY' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      On these days
                    </label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {weekdayOptions.map((day) => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => handleDayToggle(day.value)}
                          className={`px-2 py-1 text-xs rounded-full ${
                            recurrenceOptions.byDay?.includes(day.value)
                              ? 'bg-orange-500 text-white'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    End
                  </label>
                  <div className="mt-1 space-y-2">
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="end-after"
                        name="end-type"
                        checked={!!recurrenceOptions.count}
                        onChange={() => setRecurrenceOptions({
                          ...recurrenceOptions,
                          count: 10,
                          until: undefined
                        })}
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300"
                      />
                      <label htmlFor="end-after" className="ml-2 text-sm text-gray-700 flex items-center">
                        After
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={recurrenceOptions.count || 10}
                          onChange={(e) => setRecurrenceOptions({
                            ...recurrenceOptions,
                            count: parseInt(e.target.value) || 10,
                            until: undefined
                          })}
                          className="mx-2 block w-16 rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                          disabled={!recurrenceOptions.count}
                        />
                        occurrences
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="end-on"
                        name="end-type"
                        checked={!!recurrenceOptions.until}
                        onChange={() => setRecurrenceOptions({
                          ...recurrenceOptions,
                          until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                          count: undefined
                        })}
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300"
                      />
                      <label htmlFor="end-on" className="ml-2 text-sm text-gray-700 flex items-center">
                        On
                        <input
                          type="date"
                          value={recurrenceOptions.until ? format(recurrenceOptions.until, 'yyyy-MM-dd') : ''}
                          onChange={(e) => setRecurrenceOptions({
                            ...recurrenceOptions,
                            until: e.target.value ? new Date(e.target.value) : undefined,
                            count: undefined
                          })}
                          className="ml-2 block rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                          disabled={!recurrenceOptions.until}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {recurrenceOptions.byDay?.length === 0 && recurrenceOptions.frequency === 'WEEKLY' && (
                  <div className="text-sm text-yellow-600 flex items-start">
                    <AlertTriangle className="h-4 w-4 mr-1 flex-shrink-0 mt-0.5" />
                    <span>Please select at least one day of the week</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-between pt-4 border-t border-gray-200">
            {event?.id && (
              <button
                type="button"
                onClick={() => onDelete(event.id)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </button>
            )}
            <div className="flex space-x-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}