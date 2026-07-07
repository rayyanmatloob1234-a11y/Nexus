import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Video, Check, X, Clock, Plus } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const API = 'https://starlit-fragrant-devotee.ngrok-free.dev/api';

interface Meeting {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  roomId: string;
  organizer: { id: string; name: string; email: string; role: string };
  invitee: { id: string; name: string; email: string; role: string };
}

interface OtherUser {
  id: string;
  name: string;
  role: string;
}

export const MeetingsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [otherUsers, setOtherUsers] = useState<OtherUser[]>([]);
  const [inviteeId, setInviteeId] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem('business_nexus_token');

  const fetchMeetings = async () => {
    try {
      const res = await fetch(`${API}/meetings/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMeetings(data.meetings || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOtherUsers = async () => {
    // Investors see entrepreneurs, entrepreneurs see investors
    const oppositeRole = user?.role === 'investor' ? 'entrepreneur' : 'investor';
    try {
      const res = await fetch(`${API}/users?role=${oppositeRole}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setOtherUsers(data.users || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMeetings();
    fetchOtherUsers();
  }, []);

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteeId || !title || !date || !startTime || !endTime) {
      toast.error('Please fill in all fields');
      return;
    }

    setSubmitting(true);
    try {
      const startISO = new Date(`${date}T${startTime}:00`).toISOString();
      const endISO = new Date(`${date}T${endTime}:00`).toISOString();

      const res = await fetch(`${API}/meetings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          inviteeId,
          title,
          startTime: startISO,
          endTime: endISO,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create meeting');

      toast.success('Meeting requested!');
      setShowForm(false);
      setTitle('');
      setInviteeId('');
      setDate('');
      setStartTime('');
      setEndTime('');
      fetchMeetings();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const respondToMeeting = async (id: string, status: 'ACCEPTED' | 'REJECTED') => {
    try {
      const res = await fetch(`${API}/meetings/${id}/respond`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to respond');

      toast.success(status === 'ACCEPTED' ? 'Meeting accepted' : 'Meeting rejected');
      fetchMeetings();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const joinCall = (roomId: string) => {
    navigate(`/call/${roomId}`);
  };

  const statusColor = (status: string) => {
    if (status === 'ACCEPTED') return 'success';
    if (status === 'REJECTED') return 'error';
    if (status === 'CANCELLED') return 'gray';
    return 'warning';
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  if (!user) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meetings</h1>
          <p className="text-gray-600">Schedule and manage your meetings</p>
        </div>
        <Button leftIcon={<Plus size={18} />} onClick={() => setShowForm(!showForm)}>
          Schedule Meeting
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium text-gray-900">New Meeting Request</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleCreateMeeting} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meeting with
                </label>
                <select
                  value={inviteeId}
                  onChange={(e) => setInviteeId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Select a person...</option>
                  {otherUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Investment Discussion"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={submitting}>
                  Send Request
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-gray-900">Your Meetings</h2>
        </CardHeader>
        <CardBody>
          {loading ? (
            <p className="text-gray-500 text-sm">Loading meetings...</p>
          ) : meetings.length === 0 ? (
            <div className="text-center py-8">
              <Calendar size={32} className="mx-auto text-gray-400 mb-2" />
              <p className="text-gray-600">No meetings scheduled yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {meetings.map(meeting => {
                const isInvitee = meeting.invitee.id === user.id;
                const otherPerson = isInvitee ? meeting.organizer : meeting.invitee;

                return (
                  <div
                    key={meeting.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900">{meeting.title}</h3>
                        <Badge variant={statusColor(meeting.status) as any} size="sm">
                          {meeting.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        With {otherPerson.name} ({otherPerson.role.toLowerCase()})
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <Clock size={12} />
                        {formatDateTime(meeting.startTime)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {meeting.status === 'PENDING' && isInvitee && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            leftIcon={<Check size={14} />}
                            onClick={() => respondToMeeting(meeting.id, 'ACCEPTED')}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            leftIcon={<X size={14} />}
                            onClick={() => respondToMeeting(meeting.id, 'REJECTED')}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {meeting.status === 'ACCEPTED' && (
                        <Button
                          size="sm"
                          leftIcon={<Video size={14} />}
                          onClick={() => joinCall(meeting.roomId)}
                        >
                          Join Call
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};
