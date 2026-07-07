import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MessageCircle, UserCircle, TrendingUp } from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';

const API = 'https://starlit-fragrant-devotee.ngrok-free.dev/api';

interface RealUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  profile: {
    bio: string | null;
    startupName: string | null;
    industry: string | null;
  };
}

export const InvestorProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const [investor, setInvestor] = useState<RealUser | null>(null);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('business_nexus_token');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(`${API}/users/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) setInvestor(data.user);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchUser();
  }, [id]);

  if (loading) {
    return <p className="text-gray-500 text-sm py-12 text-center">Loading profile...</p>;
  }

  if (!investor || investor.role !== 'INVESTOR') {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Investor not found</h2>
        <p className="text-gray-600 mt-2">This profile doesn't exist or has been removed.</p>
        <Link to="/dashboard/entrepreneur">
          <Button variant="outline" className="mt-4">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const isCurrentUser = currentUser?.id === investor.id;
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(investor.name)}&background=random`;

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardBody className="sm:flex sm:items-start sm:justify-between p-6">
          <div className="sm:flex sm:space-x-6">
            <Avatar src={avatarUrl} alt={investor.name} size="xl" className="mx-auto sm:mx-0" />

            <div className="mt-4 sm:mt-0 text-center sm:text-left">
              <h1 className="text-2xl font-bold text-gray-900">{investor.name}</h1>
              <p className="text-gray-600 mt-1">Investor on Nexus</p>

              <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-3">
                <Badge variant="primary">
                  {investor.profile.industry || 'Interests not specified'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="mt-6 sm:mt-0 flex flex-col sm:flex-row gap-2 justify-center sm:justify-end">
            {!isCurrentUser && (
              <Link to={`/chat/${investor.id}`}>
                <Button leftIcon={<MessageCircle size={18} />}>
                  Message
                </Button>
              </Link>
            )}

            {isCurrentUser && (
              <Link to="/settings">
                <Button variant="outline" leftIcon={<UserCircle size={18} />}>
                  Edit Profile
                </Button>
              </Link>
            )}
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">About</h2>
            </CardHeader>
            <CardBody>
              <p className="text-gray-700">
                {investor.profile.bio || 'This investor hasn\'t added a bio yet.'}
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Investment Focus</h2>
            </CardHeader>
            <CardBody>
              <div>
                <span className="text-sm text-gray-500">Industry of Interest</span>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {investor.profile.industry || 'Not specified'}
                </p>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Activity</h2>
            </CardHeader>
            <CardBody>
              <div className="text-center py-6">
                <TrendingUp size={28} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">
                  Investment and meeting activity will appear here as it happens
                </p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};
