import React, { useState, useEffect } from 'react';
import { Search, Filter } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { EntrepreneurCard } from '../../components/entrepreneur/EntrepreneurCard';
import { Entrepreneur } from '../../types';

const API = 'https://starlit-fragrant-devotee.ngrok-free.dev/api';

export const EntrepreneursPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [entrepreneurs, setEntrepreneurs] = useState<Entrepreneur[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEntrepreneurs = async () => {
      try {
        const token = localStorage.getItem('business_nexus_token');
        const res = await fetch(`${API}/users?role=entrepreneur`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        const mapped: Entrepreneur[] = (data.users || []).map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: 'entrepreneur',
          avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random`,
          bio: u.profile?.bio || 'No bio added yet.',
          isOnline: false,
          createdAt: u.createdAt,
          startupName: u.profile?.startupName || 'Not specified',
          industry: u.profile?.industry || 'Not specified',
          location: 'Not specified',
          foundedYear: new Date(u.createdAt).getFullYear(),
          pitchSummary: u.profile?.bio || 'No pitch summary yet.',
          fundingNeeded: 'Not specified',
          teamSize: 0,
        }));

        setEntrepreneurs(mapped);
      } catch (err) {
        console.error('Failed to load entrepreneurs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEntrepreneurs();
  }, []);

  const filteredEntrepreneurs = entrepreneurs.filter(e =>
    searchQuery === '' ||
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.startupName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.industry.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Find Startups</h1>
        <p className="text-gray-600">Discover promising startups looking for investment</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">About</h2>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-gray-600">
                Showing real registered entrepreneurs on the Nexus platform.
              </p>
            </CardBody>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search startups by name, industry, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              startAdornment={<Search size={18} />}
              fullWidth
            />
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-gray-500" />
              <span className="text-sm text-gray-600">
                {filteredEntrepreneurs.length} results
              </span>
            </div>
          </div>

          {loading ? (
            <p className="text-gray-500 text-sm">Loading startups...</p>
          ) : filteredEntrepreneurs.length === 0 ? (
            <p className="text-gray-500 text-sm">No entrepreneurs registered yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredEntrepreneurs.map(entrepreneur => (
                <EntrepreneurCard key={entrepreneur.id} entrepreneur={entrepreneur} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
