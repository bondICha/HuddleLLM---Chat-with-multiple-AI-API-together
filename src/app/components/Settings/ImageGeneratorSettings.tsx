import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BiPlus, BiTrash, BiPencil } from 'react-icons/bi';
import { UserConfig, ImageGenerator } from '~services/user-config';
import Button from '../Button';
import ImageGeneratorEditModal from './ImageGeneratorEditModal';

interface Props {
  userConfig: UserConfig;
  updateConfigValue: (update: Partial<UserConfig>) => void;
}

const ImageGeneratorSettings: FC<Props> = ({ userConfig, updateConfigValue }) => {
  const { t } = useTranslation();
  const [editingGenerator, setEditingGenerator] = useState<ImageGenerator | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const imageGenerators = userConfig.imageGenerators || [];

  const handleSave = (generator: ImageGenerator) => {
    let updatedGenerators;
    if (isCreating) {
      updatedGenerators = [...imageGenerators, { ...generator, id: `gen-${Date.now()}` }];
    } else {
      updatedGenerators = imageGenerators.map((g) => (g.id === generator.id ? generator : g));
    }
    updateConfigValue({ imageGenerators: updatedGenerators });
    setEditingGenerator(null);
    setIsCreating(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm(t('Are you sure you want to delete this image generator?'))) {
      const updatedGenerators = imageGenerators.filter((g) => g.id !== id);
      updateConfigValue({ imageGenerators: updatedGenerators });
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex justify-between items-center">
        <p className="font-bold text-lg">{t('Image Generators')}</p>
        <Button
          size="small"
          text={t('Add New Generator')}
          icon={<BiPlus />}
          onClick={() => {
            setIsCreating(true);
            setEditingGenerator({ id: '', name: '', type: 'chutes', host: '', apiKey: '', model: '' });
          }}
          color="primary"
        />
      </div>
      <div className="p-3 w-full border border-gray-500 shadow-md rounded-lg hover:shadow-lg transition-shadow">
        <div className="space-y-2">
          {imageGenerators.map((generator) => (
            <div key={generator.id} className="flex items-center justify-between p-2 rounded-lg bg-white/10">
              <div className="flex-1">
                <p className="font-semibold">{generator.name}</p>
                <p className="text-sm opacity-70">{generator.type} - {generator.host}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="p-2 rounded-lg hover:bg-white/20"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingGenerator(generator);
                  }}
                  title={t('Edit')}
                >
                  <BiPencil size={16} />
                </button>
                <button
                  className="p-2 rounded-lg hover:bg-white/20 text-red-400"
                  onClick={() => handleDelete(generator.id)}
                  title={t('Delete')}
                >
                  <BiTrash size={16} />
                </button>
              </div>
            </div>
          ))}
          {imageGenerators.length === 0 && (
            <p className="text-center text-sm opacity-70 py-4">{t('No image generators configured.')}</p>
          )}
        </div>
      </div>
      {editingGenerator && (
        <ImageGeneratorEditModal
          open={!!editingGenerator}
          onClose={() => setEditingGenerator(null)}
          generator={editingGenerator}
          onSave={handleSave}
          isCreating={isCreating}
        />
      )}
    </div>
  );
};

export default ImageGeneratorSettings;