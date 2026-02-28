import React, { useState, useEffect } from 'react';
import { useAuth } from '../store/hooks';
import apiService from '../services/api';
import { getBackendUrlSync } from '../utils/portDetector';

interface SubscriptionDisplayProps {
  className?: string;
}

const SubscriptionDisplay: React.FC<SubscriptionDisplayProps> = ({ className }) => {
  const { user } = useAuth();
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        setLoading(true);
        const data = await apiService.getUserSubscription();
        setSubscriptionData(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch subscription data');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchSubscription();
    }
  }, [user]);

  if (!user) {
    return (
      <div className={`${className || ''} p-6 rounded-lg bg-gray-100 border border-gray-200`}>
        <p>Please log in to view subscription details.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`${className || ''} p-6 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        <span className="ml-2">Loading subscription details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className || ''} p-6 rounded-lg bg-red-50 border border-red-200`}>
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  const subscription = subscriptionData?.subscription;
  const plan = subscriptionData?.plan;

  if (!subscription) {
    return (
      <div className={`${className || ''} p-6 rounded-lg bg-gray-100 border border-gray-200`}>
        <p>No subscription data available.</p>
      </div>
    );
  }

  return (
    <div className={`${className || ''} p-6 rounded-lg bg-white border border-gray-200`}>
      <h2 className="text-xl font-bold mb-4">Subscription Details</h2>
      
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold text-gray-700">Plan</h3>
            <p className="capitalize">{subscription.planName || subscription.planId || 'N/A'}</p>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-700">Status</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              subscription.status === 'active' 
                ? 'bg-green-100 text-green-800' 
                : subscription.status === 'pending_approval'
                ? 'bg-yellow-100 text-yellow-800'
                : subscription.status === 'cancelled'
                ? 'bg-red-100 text-red-800'
                : subscription.status === 'expired'
                ? 'bg-gray-100 text-gray-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {subscription.status?.replace('_', ' ') || 'N/A'}
            </span>
          </div>
          
          {subscription.price !== undefined && subscription.currency && (
            <div>
              <h3 className="font-semibold text-gray-700">Price</h3>
              <p>{subscription.price} {subscription.currency}</p>
            </div>
          )}
          
          {subscription.paymentMethod && (
            <div>
              <h3 className="font-semibold text-gray-700">Payment Method</h3>
              <p className="capitalize">{subscription.paymentMethod}</p>
            </div>
          )}
          
          {subscription.subscribedAt && (
            <div>
              <h3 className="font-semibold text-gray-700">Subscribed On</h3>
              <p>{new Date(subscription.subscribedAt).toLocaleDateString()}</p>
            </div>
          )}
          
          {subscription.expiresAt && (
            <div>
              <h3 className="font-semibold text-gray-700">Expires On</h3>
              <p>{new Date(subscription.expiresAt).toLocaleDateString()}</p>
            </div>
          )}
        </div>

        {/* Screenshot Display */}
        {subscription.screenshotPath && (
          <div className="mt-6">
            <h3 className="font-semibold text-gray-700 mb-2">Payment Screenshot</h3>
            <div className="border rounded-lg p-4 bg-gray-50">
              <p className="text-sm text-gray-600 mb-2">Uploaded payment confirmation:</p>
              <div className="max-w-md">
                <img 
                  src={`${getBackendUrlSync()}/uploads/${subscription.screenshotPath}`} 
                  alt="Payment confirmation screenshot" 
                  className="max-w-full h-auto rounded border"
                />
              </div>
            </div>
          </div>
        )}

        {!subscription.screenshotPath && subscription.status === 'pending_approval' && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-700 text-sm">
              <strong>Note:</strong> Your subscription is pending approval. Please make sure you've uploaded a screenshot of your payment transaction.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionDisplay;