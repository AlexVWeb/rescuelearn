<?php

namespace App\Controller\Admin;

use App\Entity\QuestionOption;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextareaField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;

class QuestionOptionCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return QuestionOption::class;
    }

    public function configureFields(string $pageName): iterable
    {
        yield AssociationField::new('question', 'Question');
        yield TextField::new('optionId', 'ID de l\'option');
        yield TextareaField::new('text', 'Texte de l\'option');
    }
} 