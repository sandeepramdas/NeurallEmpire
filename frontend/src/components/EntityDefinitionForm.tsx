import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Save,
  X,
  Database,
  Type,
  Hash,
  ToggleLeft,
  Calendar,
  FileText,
  Code,
  List,
  Link,
} from 'lucide-react';

interface Column {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'text' | 'json' | 'enum' | 'reference';
  maxLength?: number;
  nullable?: boolean;
  unique?: boolean;
  index?: boolean;
  displayName?: string;
  defaultValue?: any;
  values?: string[]; // For enum type
  referenceEntity?: string; // For reference type
  referenceColumn?: string;
  onDelete?: 'CASCADE' | 'RESTRICT' | 'SET NULL';
}

interface EntityFormData {
  entityName: string;
  displayName: string;
  vertical?: string;
  module?: string;
  category?: string;
  description?: string;
  tags: string[];
  columns: Column[];
  isOrganizationScoped: boolean;
  enableAudit: boolean;
  enableWorkflow: boolean;
  enableVersioning: boolean;
  softDelete: boolean;
}

interface EntityDefinitionFormProps {
  onSubmit: (data: EntityFormData) => void;
  onCancel: () => void;
  initialData?: Partial<EntityFormData>;
}

const columnTypeOptions = [
  { value: 'string', label: 'String (Text)', icon: <Type className="w-4 h-4" /> },
  { value: 'number', label: 'Number (Decimal)', icon: <Hash className="w-4 h-4" /> },
  { value: 'boolean', label: 'Boolean (True/False)', icon: <ToggleLeft className="w-4 h-4" /> },
  { value: 'date', label: 'Date', icon: <Calendar className="w-4 h-4" /> },
  { value: 'datetime', label: 'Date & Time', icon: <Calendar className="w-4 h-4" /> },
  { value: 'text', label: 'Long Text', icon: <FileText className="w-4 h-4" /> },
  { value: 'json', label: 'JSON Object', icon: <Code className="w-4 h-4" /> },
  { value: 'enum', label: 'Enum (List of Values)', icon: <List className="w-4 h-4" /> },
  { value: 'reference', label: 'Reference (Foreign Key)', icon: <Link className="w-4 h-4" /> },
];

const EntityDefinitionForm: React.FC<EntityDefinitionFormProps> = ({
  onSubmit,
  onCancel,
  initialData
}) => {
  const [formData, setFormData] = useState<EntityFormData>({
    entityName: initialData?.entityName || '',
    displayName: initialData?.displayName || '',
    vertical: initialData?.vertical || '',
    module: initialData?.module || '',
    category: initialData?.category || 'transactional',
    description: initialData?.description || '',
    tags: initialData?.tags || [],
    columns: initialData?.columns || [],
    isOrganizationScoped: initialData?.isOrganizationScoped ?? true,
    enableAudit: initialData?.enableAudit ?? true,
    enableWorkflow: initialData?.enableWorkflow ?? false,
    enableVersioning: initialData?.enableVersioning ?? false,
    softDelete: initialData?.softDelete ?? true,
  });

  const [newTag, setNewTag] = useState('');
  const [newColumn, setNewColumn] = useState<Partial<Column>>({
    type: 'string',
    nullable: true,
    unique: false,
    index: false
  });
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleAddColumn = () => {
    if (!newColumn.name) {
      setErrors({ ...errors, columnName: 'Column name is required' });
      return;
    }

    if (formData.columns.some(col => col.name === newColumn.name)) {
      setErrors({ ...errors, columnName: 'Column name must be unique' });
      return;
    }

    setFormData({
      ...formData,
      columns: [...formData.columns, newColumn as Column]
    });

    setNewColumn({
      type: 'string',
      nullable: true,
      unique: false,
      index: false
    });
    setShowAddColumn(false);
    setErrors({});
  };

  const handleRemoveColumn = (index: number) => {
    setFormData({
      ...formData,
      columns: formData.columns.filter((_, i) => i !== index)
    });
  };

  const handleAddTag = () => {
    if (newTag && !formData.tags.includes(newTag)) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag]
      });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tag)
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.entityName) {
      newErrors.entityName = 'Entity name is required';
    } else if (!/^[a-z][a-z0-9_]*$/.test(formData.entityName)) {
      newErrors.entityName = 'Entity name must be lowercase, start with a letter, and contain only letters, numbers, and underscores';
    }

    if (!formData.displayName) {
      newErrors.displayName = 'Display name is required';
    }

    if (formData.columns.length === 0) {
      newErrors.columns = 'At least one column is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Database className="w-8 h-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Create Entity Definition</h2>
            <p className="text-sm text-gray-600">Define a custom business entity for your organization</p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Form Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Basic Information */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Entity Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.entityName}
                onChange={(e) => setFormData({ ...formData, entityName: e.target.value.toLowerCase() })}
                placeholder="patient, invoice, product..."
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.entityName ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.entityName && (
                <p className="mt-1 text-sm text-red-600">{errors.entityName}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">Lowercase, snake_case identifier</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="Patient, Invoice, Product..."
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.displayName ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.displayName && (
                <p className="mt-1 text-sm text-red-600">{errors.displayName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Vertical</label>
              <select
                value={formData.vertical}
                onChange={(e) => setFormData({ ...formData, vertical: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select vertical...</option>
                <option value="healthcare">Healthcare</option>
                <option value="finance">Finance</option>
                <option value="manufacturing">Manufacturing</option>
                <option value="retail">Retail</option>
                <option value="education">Education</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Module</label>
              <input
                type="text"
                value={formData.module}
                onChange={(e) => setFormData({ ...formData, module: e.target.value })}
                placeholder="sales, inventory, hr..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the purpose of this entity..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-blue-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="Add tag..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Column Definition */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Schema Definition
              {errors.columns && (
                <span className="ml-2 text-sm text-red-600">({errors.columns})</span>
              )}
            </h3>
            <button
              onClick={() => setShowAddColumn(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add Column
            </button>
          </div>

          {/* Columns List */}
          {formData.columns.length > 0 ? (
            <div className="space-y-2">
              {formData.columns.map((column, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex-1 grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{column.name}</p>
                      <p className="text-xs text-gray-500">{column.displayName || column.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{column.type}</p>
                      {column.maxLength && (
                        <p className="text-xs text-gray-500">max: {column.maxLength}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {!column.nullable && (
                        <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded">NOT NULL</span>
                      )}
                      {column.unique && (
                        <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">UNIQUE</span>
                      )}
                      {column.index && (
                        <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">INDEXED</span>
                      )}
                    </div>
                    <div className="text-right">
                      <button
                        onClick={() => handleRemoveColumn(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <Database className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No columns defined yet</p>
              <p className="text-sm text-gray-500">Add columns to define your entity schema</p>
            </div>
          )}
        </div>

        {/* Entity Behaviors */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Entity Behaviors</h3>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100">
              <input
                type="checkbox"
                checked={formData.isOrganizationScoped}
                onChange={(e) => setFormData({ ...formData, isOrganizationScoped: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <div>
                <p className="font-medium text-gray-900">Organization Scoped</p>
                <p className="text-sm text-gray-600">Include organizationId column</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100">
              <input
                type="checkbox"
                checked={formData.enableAudit}
                onChange={(e) => setFormData({ ...formData, enableAudit: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <div>
                <p className="font-medium text-gray-900">Enable Audit</p>
                <p className="text-sm text-gray-600">Track created/updated by/at</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100">
              <input
                type="checkbox"
                checked={formData.softDelete}
                onChange={(e) => setFormData({ ...formData, softDelete: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <div>
                <p className="font-medium text-gray-900">Soft Delete</p>
                <p className="text-sm text-gray-600">Use deletedAt instead of hard delete</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100">
              <input
                type="checkbox"
                checked={formData.enableVersioning}
                onChange={(e) => setFormData({ ...formData, enableVersioning: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <div>
                <p className="font-medium text-gray-900">Enable Versioning</p>
                <p className="text-sm text-gray-600">Track schema evolution</p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Add Column Modal */}
      {showAddColumn && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-10">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold mb-4">Add Column</h3>

            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Column Name</label>
                  <input
                    type="text"
                    value={newColumn.name || ''}
                    onChange={(e) => setNewColumn({ ...newColumn, name: e.target.value })}
                    placeholder="fieldName"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.columnName ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.columnName && (
                    <p className="mt-1 text-sm text-red-600">{errors.columnName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Display Name</label>
                  <input
                    type="text"
                    value={newColumn.displayName || ''}
                    onChange={(e) => setNewColumn({ ...newColumn, displayName: e.target.value })}
                    placeholder="Field Name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Data Type</label>
                  <select
                    value={newColumn.type}
                    onChange={(e) => setNewColumn({ ...newColumn, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {columnTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {newColumn.type === 'string' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Length</label>
                    <input
                      type="number"
                      value={newColumn.maxLength || ''}
                      onChange={(e) => setNewColumn({ ...newColumn, maxLength: parseInt(e.target.value) || undefined })}
                      placeholder="255"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!newColumn.nullable}
                    onChange={(e) => setNewColumn({ ...newColumn, nullable: !e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm">Required (NOT NULL)</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newColumn.unique || false}
                    onChange={(e) => setNewColumn({ ...newColumn, unique: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm">Unique</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newColumn.index || false}
                    onChange={(e) => setNewColumn({ ...newColumn, index: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm">Index</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowAddColumn(false);
                  setNewColumn({ type: 'string', nullable: true, unique: false, index: false });
                  setErrors({});
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddColumn}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Column
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-600">
          {formData.columns.length} column(s) defined
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            Create Entity
          </button>
        </div>
      </div>
    </div>
  );
};

export default EntityDefinitionForm;
