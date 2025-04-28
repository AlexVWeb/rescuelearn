<?php

namespace App\Controller\Admin;

use App\Entity\Referenciel;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IntegerField;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Field\FormField;
use EasyCorp\Bundle\EasyAdminBundle\Field\Field;
use EasyCorp\Bundle\EasyAdminBundle\Field\UrlField;
use Symfony\Component\Form\Extension\Core\Type\FileType;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\String\Slugger\SluggerInterface;

class ReferencielCrudController extends AbstractCrudController
{
    public function __construct(
        private SluggerInterface $slugger
    ) {
    }

    public static function getEntityFqcn(): string
    {
        return Referenciel::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setEntityLabelInSingular('Référentiel')
            ->setEntityLabelInPlural('Référentiels')
            ->setPageTitle('index', 'Gestion des référentiels')
            ->setPageTitle('new', 'Créer un référentiel')
            ->setPageTitle('edit', 'Modifier un référentiel');
    }

    public function configureFields(string $pageName): iterable
    {
        $fields = [
            IdField::new('id')->hideOnForm(),
            TextField::new('title', 'Titre'),
            IntegerField::new('year_edition', 'Année d\'édition'),
        ];

        if ($pageName === Crud::PAGE_INDEX || $pageName === Crud::PAGE_DETAIL) {
            $fields[] = UrlField::new('pdfUrl', 'Fichier PDF')
                ->setTemplatePath('admin/field/pdf_url.html.twig');
        } else {
            $fields[] = FormField::addPanel('Fichier PDF')
                ->setIcon('fa fa-file-pdf')
                ->setHelp('Uploader un fichier PDF (max 5Mo)');
            $fields[] = Field::new('pdfFile', 'Fichier PDF')
                ->setFormType(FileType::class)
                ->setFormTypeOptions([
                    'required' => true,
                    'attr' => ['accept' => '.pdf'],
                    'mapped' => true,
                ]);
        }

        return $fields;
    }

    private function generateFileName(Referenciel $referenciel, UploadedFile $file): string
    {
        $title = $this->slugger->slug($referenciel->getTitle())->lower();
        $year = $referenciel->getYearEdition();
        $timestamp = time();
        $extension = $file->guessExtension();

        return sprintf('%s_%d_%d.%s', $title, $year, $timestamp, $extension);
    }

    public function persistEntity($entityManager, $entityInstance): void
    {
        if ($entityInstance->getPdfFile() instanceof UploadedFile) {
            $file = $entityInstance->getPdfFile();
            $fileName = $this->generateFileName($entityInstance, $file);
            $file->move(
                $this->getParameter('kernel.project_dir') . '/public/uploads/referenciels',
                $fileName
            );
            $entityInstance->setPdfUrl('uploads/referenciels/' . $fileName);
        }
        parent::persistEntity($entityManager, $entityInstance);
    }

    public function updateEntity($entityManager, $entityInstance): void
    {
        if ($entityInstance->getPdfFile() instanceof UploadedFile) {
            $file = $entityInstance->getPdfFile();
            $fileName = $this->generateFileName($entityInstance, $file);
            $file->move(
                $this->getParameter('kernel.project_dir') . '/public/uploads/referenciels',
                $fileName
            );
            $entityInstance->setPdfUrl('uploads/referenciels/' . $fileName);
        }
        parent::updateEntity($entityManager, $entityInstance);
    }
} 