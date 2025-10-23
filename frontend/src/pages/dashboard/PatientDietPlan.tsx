import React, { useState, useEffect } from 'react';
import { Apple, Plus, Search, Calendar, Utensils, AlertCircle, CheckCircle, Loader, Eye, Trash2 } from 'lucide-react';
import { api } from '@/services/api';
import { RightPanel } from '@/components/ui/RightPanel';
import { ModelSelector } from '@/components/ai-models/ModelSelector';

interface DietPlan {
  id: string;
  patientName: string;
  disease: string;
  timespan: string;
  mealsPerDay: number;
  dietPlan: any;
  createdAt: string;
  status: string;
  validUntil?: string;
}

const PatientDietPlan: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dietPlans, setDietPlans] = useState<DietPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<DietPlan | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    patientName: '',
    patientAge: '',
    patientGender: '',
    disease: '',
    allergies: '',
    medications: '',
    dietaryRestrictions: '',
    timespan: 'weekly',
    customDays: '',
    mealsPerDay: 3,
    specialInstructions: '',
    aiModelConfigId: ''
  });

  useEffect(() => {
    fetchDietPlans();
  }, []);

  const fetchDietPlans = async () => {
    try {
      const response = await api.get('/diet-plans');
      if (response.data.success) {
        setDietPlans(response.data.data || []);
      }
    } catch (err: any) {
      console.error('Error fetching diet plans:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        patientName: formData.patientName,
        patientAge: formData.patientAge ? parseInt(formData.patientAge) : undefined,
        patientGender: formData.patientGender || undefined,
        disease: formData.disease,
        allergies: formData.allergies ? formData.allergies.split(',').map(a => a.trim()) : [],
        medications: formData.medications ? formData.medications.split(',').map(m => m.trim()) : [],
        dietaryRestrictions: formData.dietaryRestrictions ? formData.dietaryRestrictions.split(',').map(d => d.trim()) : [],
        timespan: formData.timespan,
        customDays: formData.customDays ? parseInt(formData.customDays) : undefined,
        mealsPerDay: formData.mealsPerDay,
        specialInstructions: formData.specialInstructions || undefined,
        aiModelConfigId: formData.aiModelConfigId
      };

      const response = await api.post('/diet-plans/generate', payload);

      if (response.data.success) {
        setSuccess('Diet plan generated successfully!');
        setShowForm(false);
        fetchDietPlans();
        // Reset form
        setFormData({
          patientName: '',
          patientAge: '',
          patientGender: '',
          disease: '',
          allergies: '',
          medications: '',
          dietaryRestrictions: '',
          timespan: 'weekly',
          customDays: '',
          mealsPerDay: 3,
          specialInstructions: '',
          aiModelConfigId: ''
        });
      }
    } catch (err: any) {
      console.error('Diet plan generation error:', err);
      console.error('Error response:', err.response);
      const errorMessage = err.response?.data?.message ||
                          err.response?.data?.error ||
                          err.message ||
                          'Failed to generate diet plan. Please check the console for details.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deleteDietPlan = async (id: string) => {
    if (!confirm('Are you sure you want to delete this diet plan?')) return;

    try {
      await api.delete(`/diet-plans/${id}`);
      setSuccess('Diet plan deleted successfully');
      fetchDietPlans();
    } catch (err: any) {
      setError('Failed to delete diet plan');
    }
  };

  const filteredPlans = dietPlans.filter(plan =>
    plan.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    plan.disease.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Apple className="w-8 h-8 text-green-600" />
            Patient Diet Plan
          </h1>
          <p className="text-gray-600 mt-2">AI-powered personalized diet plans for patient health conditions</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Generate Diet Plan
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Total Plans</div>
          <div className="text-2xl font-bold text-gray-900">{dietPlans.length}</div>
          <div className="text-xs text-gray-500 mt-2">Generated diet plans</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Active Plans</div>
          <div className="text-2xl font-bold text-green-600">
            {dietPlans.filter(p => p.status === 'active').length}
          </div>
          <div className="text-xs text-gray-500 mt-2">Currently active</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">This Month</div>
          <div className="text-2xl font-bold text-blue-600">
            {dietPlans.filter(p => new Date(p.createdAt).getMonth() === new Date().getMonth()).length}
          </div>
          <div className="text-xs text-gray-500 mt-2">Plans generated</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">AI Model</div>
          <div className="text-lg font-bold text-purple-600">GPT-4</div>
          <div className="text-xs text-gray-500 mt-2">Powered by OpenAI</div>
        </div>
      </div>

      {/* Generation Form - Right Panel */}
      <RightPanel
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Generate New Diet Plan"
        width="60%"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Patient Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="patientName"
                  value={formData.patientName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter patient name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Disease/Condition <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="disease"
                  value={formData.disease}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., Diabetes, Hypertension"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                <input
                  type="number"
                  name="patientAge"
                  value={formData.patientAge}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Patient age"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select
                  name="patientGender"
                  value={formData.patientGender}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timespan</label>
                <select
                  name="timespan"
                  value={formData.timespan}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="weekly">Weekly (7 days)</option>
                  <option value="monthly">Monthly (30 days)</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              {formData.timespan === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custom Days</label>
                  <input
                    type="number"
                    name="customDays"
                    value={formData.customDays}
                    onChange={handleInputChange}
                    min="1"
                    max="90"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Number of days"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meals Per Day</label>
                <input
                  type="number"
                  name="mealsPerDay"
                  value={formData.mealsPerDay}
                  onChange={handleInputChange}
                  min="1"
                  max="6"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <ModelSelector
                  value={formData.aiModelConfigId}
                  onChange={(id) => setFormData(prev => ({ ...prev, aiModelConfigId: id }))}
                  label="AI Model"
                  required
                  placeholder="Select an AI model"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Allergies <span className="text-gray-500 text-xs">(comma separated)</span>
              </label>
              <input
                type="text"
                name="allergies"
                value={formData.allergies}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="e.g., Peanuts, Shellfish, Dairy"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Medications <span className="text-gray-500 text-xs">(comma separated)</span>
              </label>
              <input
                type="text"
                name="medications"
                value={formData.medications}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="e.g., Metformin, Lisinopril"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dietary Restrictions <span className="text-gray-500 text-xs">(comma separated)</span>
              </label>
              <input
                type="text"
                name="dietaryRestrictions"
                value={formData.dietaryRestrictions}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="e.g., Vegetarian, Vegan, Gluten-free"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions</label>
              <textarea
                name="specialInstructions"
                value={formData.specialInstructions}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Any additional requirements or preferences..."
              />
            </div>

            <div className="flex gap-3 pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Utensils className="w-5 h-5" />
                    Generate Diet Plan
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
      </RightPanel>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by patient name or disease..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Diet Plans List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Disease
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPlans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No diet plans found. Generate your first diet plan!
                  </td>
                </tr>
              ) : (
                filteredPlans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{plan.patientName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{plan.disease}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 capitalize flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {plan.timespan}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(plan.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        plan.status === 'active' ? 'bg-green-100 text-green-800' :
                        plan.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {plan.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedPlan(plan)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Plan"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => deleteDietPlan(plan.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Diet Plan Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">
                Diet Plan for {selectedPlan.patientName}
              </h2>
              <button
                onClick={() => setSelectedPlan(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Summary */}
              {selectedPlan.dietPlan?.summary && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-lg text-green-900 mb-2">
                    {selectedPlan.dietPlan.summary.title}
                  </h3>
                  <p className="text-green-800 mb-3">{selectedPlan.dietPlan.summary.description}</p>
                  {selectedPlan.dietPlan.summary.keyRecommendations && (
                    <div>
                      <h4 className="font-medium text-green-900 mb-2">Key Recommendations:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {selectedPlan.dietPlan.summary.keyRecommendations.map((rec: string, idx: number) => (
                          <li key={idx} className="text-green-800">{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Daily Plans */}
              {selectedPlan.dietPlan?.dailyPlans && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg text-gray-900">Daily Meal Plans</h3>
                  {selectedPlan.dietPlan.dailyPlans.slice(0, 3).map((day: any, idx: number) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">Day {day.day}</h4>
                      <div className="space-y-3">
                        {day.meals?.map((meal: any, mealIdx: number) => (
                          <div key={mealIdx} className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Utensils className="w-4 h-4 text-green-600" />
                              <span className="font-medium text-gray-900">{meal.mealType}</span>
                              {meal.time && <span className="text-sm text-gray-500">• {meal.time}</span>}
                            </div>
                            <p className="font-medium text-gray-800 mb-1">{meal.name}</p>
                            {meal.ingredients && (
                              <p className="text-sm text-gray-600 mb-1">
                                <strong>Ingredients:</strong> {meal.ingredients.join(', ')}
                              </p>
                            )}
                            {meal.preparation && (
                              <p className="text-sm text-gray-600 mb-1">
                                <strong>Preparation:</strong> {meal.preparation}
                              </p>
                            )}
                            {meal.nutrition && (
                              <div className="text-xs text-gray-600 mt-2 flex flex-wrap gap-3">
                                {meal.nutrition.calories && <span>🔥 {meal.nutrition.calories}</span>}
                                {meal.nutrition.protein && <span>🥩 {meal.nutrition.protein} protein</span>}
                                {meal.nutrition.carbs && <span>🍞 {meal.nutrition.carbs} carbs</span>}
                                {meal.nutrition.fats && <span>🥑 {meal.nutrition.fats} fats</span>}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Additional Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {selectedPlan.dietPlan?.foodsToAvoid && selectedPlan.dietPlan.foodsToAvoid.length > 0 && (
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h4 className="font-medium text-red-900 mb-2">Foods to Avoid</h4>
                    <ul className="list-disc list-inside text-sm text-red-800 space-y-1">
                      {selectedPlan.dietPlan.foodsToAvoid.map((food: string, idx: number) => (
                        <li key={idx}>{food}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {selectedPlan.dietPlan?.foodsToEmphasize && selectedPlan.dietPlan.foodsToEmphasize.length > 0 && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-2">Foods to Emphasize</h4>
                    <ul className="list-disc list-inside text-sm text-green-800 space-y-1">
                      {selectedPlan.dietPlan.foodsToEmphasize.map((food: string, idx: number) => (
                        <li key={idx}>{food}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => setSelectedPlan(null)}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDietPlan;
