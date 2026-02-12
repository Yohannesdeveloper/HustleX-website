import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../store/hooks';
import { getBackendUrlSync } from '../utils/portDetector';

const SubscriptionAdmin: React.FC = () => {
    const { user } = useAuth();
    const token = localStorage.getItem("token");
    const [subscriptions, setSubscriptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSubscriptions();
    }, [token]);

    const fetchSubscriptions = async () => {
        if (!token) {
            console.log("No token found, stopping load.");
            setLoading(false);
            return;
        }
        try {
            const baseUrl = window.location.hostname.includes("devtunnels")
                ? `https://${window.location.hostname}`
                : process.env.NODE_ENV === "production"
                    ? "https://your-domain.com"
                    : getBackendUrlSync();

            const response = await axios.get(`${baseUrl}/api/pricing/admin/pending-subscriptions`, {
                headers: { Authorization: `Bearer ${token}`, "x-admin-code": "JobModeration" } // Using JobModeration fallback for now if environment variable is tricky
            });
            setSubscriptions((response.data as any).subscriptions);
        } catch (error: any) {
            console.error("Error fetching subscriptions", error);
            if (error.response?.status === 401 || error.response?.status === 403) {
                // Redirect to login or show clear error
                alert("Session expired or unauthorized. Please login again.");
                window.location.href = "/login";
            }
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (userId: string) => {
        try {
            const baseUrl = window.location.hostname.includes("devtunnels")
                ? `https://${window.location.hostname}`
                : process.env.NODE_ENV === "production"
                    ? "https://your-domain.com"
                    : getBackendUrlSync();

            await axios.post(`${baseUrl}/api/pricing/admin/approve/${userId}`, {}, {
                headers: { Authorization: `Bearer ${token}`, "x-admin-code": "JobModeration" }
            });
            alert("Approved!");
            fetchSubscriptions();
        } catch (error) {
            console.error(error);
            alert("Failed to approve");
        }
    }

    const handleReject = async (userId: string) => {
        try {
            const baseUrl = window.location.hostname.includes("devtunnels")
                ? `https://${window.location.hostname}`
                : process.env.NODE_ENV === "production"
                    ? "https://your-domain.com"
                    : getBackendUrlSync();

            await axios.post(`${baseUrl}/api/pricing/admin/reject/${userId}`, {}, {
                headers: { Authorization: `Bearer ${token}`, "x-admin-code": "JobModeration" }
            });
            alert("Rejected!");
            fetchSubscriptions();
        } catch (error) {
            console.error(error);
            alert("Failed to reject");
        }
    }

    // Basic admin check - ideally role check
    const isAdmin = user?.roles?.includes('admin');

    // if (!isAdmin) {
    //     return (
    //         <div className="flex flex-col items-center justify-center min-h-screen">
    //             <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
    //             <p>You need admin privileges to view this page.</p>
    //             {/* Temporary bypass for testing if role is not set */}
    //             {/* <button onClick={() => fetchSubscriptions()} className="mt-4 bg-gray-200 px-4 py-2">Try Fetch Anyway (Testing)</button> */}
    //         </div>
    //     );
    // }

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Subscription Approvals</h1>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">Loading...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested At</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {subscriptions.map(sub => (
                                    <tr key={sub._id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{sub.profile?.firstName} {sub.profile?.lastName}</div>
                                            <div className="text-sm text-gray-500">{sub.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                                {sub.subscription.planName}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {sub.subscription.price} {sub.subscription.currency}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(sub.subscription.subscribedAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button
                                                onClick={() => handleApprove(sub._id)}
                                                className="text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded mr-3 transition-colors"
                                            >
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => handleReject(sub._id)}
                                                className="text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded transition-colors"
                                            >
                                                Reject
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {subscriptions.length === 0 && (
                            <div className="p-8 text-center text-gray-500">
                                No pending subscriptions found.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SubscriptionAdmin;
