import React, { useState, useEffect } from 'react';
import { Search, Filter } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { InvestorCard } from '../../components/investor/InvestorCard';
import { Investor } from '../../types';

const API = 'https://starlit-fragrant-devotee.ngrok-free.dev/api';

export const InvestorsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvestors = async () => {
      try {
        const token = localStorage.getItem('business_nexus_token');
        const res = await fetch(`${API}/users?role=investor`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        // Map real backend users into the shape InvestorCard expects
        const mapped: Investor[] = (data.users || []).map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: 'investor',
          avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random`,
          bio: u.profile?.bio || 'No bio added yet.',
          isOnline: false,
          createdAt: u.createdAt,
          investmentStage: u.profile?.industry ? [u.profile.industry] : ['Not specified'],
          investmentInterests: u.profile?.startupName ? [u.profile.startupName] : ['Not specified'],
          totalInvestments: 0,
          minimumInvestment: 'Not specified',
          maximumInvestment: 'Not specified',
        }));

        setInvestors(mapped);
      } catch (err) {
        console.error('Failed to load investors:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInvestors();
  }, []);

  const filteredInvestors = investors.filter(investor =>
    searchQuery === '' ||
    investor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    investor.bio.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Find Investors</h1>
        <p className="text-gray-600">Connect with investors who match your startup's needs</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">About</h2>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-gray-600">
                Showing real registered investors on the Nexus platform.
              </p>
            </CardBody>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search investors by name or bio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              startAdornment={<Search size={18} />}
              fullWidth
            />
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-gray-500" />
              <span className="text-sm text-gray-600">
                {filteredInvestors.length} results
              </span>
            </div>
          </div>

          {loading ? (
            <p className="text-gray-500 text-sm">Loading investors...</p>
          ) : filteredInvestors.length === 0 ? (
            <p className="text-gray-500 text-sm">No investors registered yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredInvestors.map(investor => (
                <InvestorCard key={investor.id} investor={investor} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
