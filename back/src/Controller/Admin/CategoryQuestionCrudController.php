<?php

namespace App\Controller\Admin;

use App\Entity\CategoryQuestion;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;

class CategoryQuestionCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return CategoryQuestion::class;
    }

    public function configureFields(string $pageName): iterable
    {
        return [
            IdField::new('id')->hideOnForm(),
            TextField::new('name', 'Nom'),
            AssociationField::new('questions', 'Questions')
                ->setFormTypeOptions([
                    'by_reference' => false,
                ]),
        ];
    }
} 