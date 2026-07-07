import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const API = 'https://starlit-fragrant-devotee.ngrok-free.dev/api';

interface Transaction {
  id: string;
  amount: string;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  sender: { id: string; name: string; email: string };
  receiver: { id: string; name: string; email: string };
}

interface OtherUser {
  id: string;
  name: string;
  role: string;
}

export const PaymentsPage: React.FC = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [otherUsers, setOtherUsers] = useState<OtherUser[]>([]);
  const [receiverId, setReceiverId] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem('business_nexus_token');

  const fetchTransactions = async () => {
    try {
      const res = await fetch(`${API}/payments/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOtherUsers = async () => {
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
    fetchTransactions();
    fetchOtherUsers();
  }, []);

  const handleSendPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiverId || !amount || Number(amount) <= 0) {
      toast.error('Please select a recipient and enter a valid amount');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/payments/create-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ receiverId, amount: Number(amount) }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create payment');

      // For this demo we auto-confirm since we don't have a live Stripe Elements form —
      // the transaction is created as PENDING, confirmed here to simulate a completed sandbox payment.
      const confirmRes = await fetch(`${API}/payments/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ transactionId: data.transaction.id }),
      });
      await confirmRes.json();

      toast.success('Payment sent!');
      setShowForm(false);
      setReceiverId('');
      setAmount('');
      fetchTransactions();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const statusVariant = (status: string) => {
    if (status === 'COMPLETED') return 'success';
    if (status === 'FAILED') return 'error';
    return 'warning';
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

  if (!user) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600">Send funds and track your transaction history</p>
        </div>
        <Button leftIcon={<Plus size={18} />} onClick={() => setShowForm(!showForm)}>
          Send Payment
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium text-gray-900">New Payment</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSendPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Send to
                </label>
                <select
                  value={receiverId}
                  onChange={(e) => setReceiverId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Select a person...</option>
                  {otherUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-gray-300 rounded-md pl-7 pr-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={submitting}>
                  Send Payment
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-gray-900">Transaction History</h2>
        </CardHeader>
        <CardBody>
          {loading ? (
            <p className="text-gray-500 text-sm">Loading transactions...</p>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign size={32} className="mx-auto text-gray-400 mb-2" />
              <p className="text-gray-600">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map(tx => {
                const isSender = tx.sender.id === user.id;
                const otherPerson = isSender ? tx.receiver : tx.sender;

                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${isSender ? 'bg-red-50' : 'bg-green-50'}`}>
                        {isSender ? (
                          <ArrowUpRight size={18} className="text-red-600" />
                        ) : (
                          <ArrowDownLeft size={18} className="text-green-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {isSender ? `To ${otherPerson.name}` : `From ${otherPerson.name}`}
                        </p>
                        <p className="text-xs text-gray-500">{formatDate(tx.createdAt)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-semibold ${isSender ? 'text-red-600' : 'text-green-600'}`}>
                        {isSender ? '-' : '+'}${Number(tx.amount).toFixed(2)}
                      </span>
                      <Badge variant={statusVariant(tx.status) as any} size="sm">
                        {tx.status}
                      </Badge>
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
